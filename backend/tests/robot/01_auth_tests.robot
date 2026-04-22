*** Settings ***
Resource          resources/keywords.robot
Suite Setup       Create API Session

*** Variables ***
${CREATED_USER_ID}    ${EMPTY}

*** Test Cases ***

# ---------------------------------------------------------------------------
# TC-AUTH-001: Login สำเร็จด้วย credential ถูกต้อง
# ---------------------------------------------------------------------------
TC-AUTH-001 Login With Valid Credentials
    [Documentation]    POST /api/auth/login ด้วย email+password ถูกต้อง ต้องได้ access_token กลับมา
    [Tags]    auth    positive
    ${body}=    Create Dictionary    email=${ADMIN_EMAIL}    password=${ADMIN_PASSWORD}
    ${resp}=    POST On Session    ropa    /api/auth/login    json=${body}
    Response Should Be OK    ${resp}
    Dictionary Should Contain Key    ${resp.json()}    access_token
    Dictionary Should Contain Key    ${resp.json()}    token_type
    Dictionary Should Contain Key    ${resp.json()}    user
    Should Be Equal As Strings    ${resp.json()['token_type']}    bearer
    Should Be Equal As Strings    ${resp.json()['user']['role']}    Admin

# ---------------------------------------------------------------------------
# TC-AUTH-002: Login ด้วย password ผิด ต้องได้ 401
# ---------------------------------------------------------------------------
TC-AUTH-002 Login With Wrong Password
    [Documentation]    POST /api/auth/login ด้วย password ผิด ต้องได้ 401
    [Tags]    auth    negative
    ${body}=    Create Dictionary    email=${ADMIN_EMAIL}    password=wrongpassword
    ${resp}=    POST On Session    ropa    /api/auth/login    json=${body}    expected_status=any
    Response Should Be Unauthorized    ${resp}
    Should Be Equal As Strings    ${resp.json()['detail']}    อีเมลหรือรหัสผ่านไม่ถูกต้อง

# ---------------------------------------------------------------------------
# TC-AUTH-003: Login ด้วย email ที่ไม่มีในระบบ ต้องได้ 401
# ---------------------------------------------------------------------------
TC-AUTH-003 Login With Unknown Email
    [Documentation]    POST /api/auth/login ด้วย email ที่ไม่มีในระบบ ต้องได้ 401
    [Tags]    auth    negative
    ${body}=    Create Dictionary    email=notexist@example.com    password=anypassword
    ${resp}=    POST On Session    ropa    /api/auth/login    json=${body}    expected_status=any
    Response Should Be Unauthorized    ${resp}

# ---------------------------------------------------------------------------
# TC-AUTH-004: GET /api/auth/me ด้วย token ถูกต้อง
# ---------------------------------------------------------------------------
TC-AUTH-004 Get Current User Info
    [Documentation]    GET /api/auth/me ต้องได้ข้อมูล user ปัจจุบัน
    [Tags]    auth    positive
    ${token}=    Get Auth Token    ${ADMIN_EMAIL}    ${ADMIN_PASSWORD}
    ${headers}=    Auth Header    ${token}
    ${resp}=    GET On Session    ropa    /api/auth/me    headers=${headers}
    Response Should Be OK    ${resp}
    Should Be Equal As Strings    ${resp.json()['email']}    ${ADMIN_EMAIL}
    Dictionary Should Contain Key    ${resp.json()}    role
    Dictionary Should Contain Key    ${resp.json()}    id

# ---------------------------------------------------------------------------
# TC-AUTH-005: GET /api/auth/me โดยไม่มี token ต้องได้ 401
# ---------------------------------------------------------------------------
TC-AUTH-005 Get Me Without Token
    [Documentation]    GET /api/auth/me โดยไม่ส่ง Authorization header ต้องได้ 401
    [Tags]    auth    negative
    ${resp}=    GET On Session    ropa    /api/auth/me    expected_status=any
    Response Should Be Unauthorized    ${resp}

# ---------------------------------------------------------------------------
# TC-AUTH-006: GET /api/auth/me ด้วย token ปลอม ต้องได้ 401
# ---------------------------------------------------------------------------
TC-AUTH-006 Get Me With Invalid Token
    [Documentation]    GET /api/auth/me ด้วย token ปลอม ต้องได้ 401
    [Tags]    auth    negative
    ${headers}=    Create Dictionary    Authorization=Bearer invalidtoken123
    ${resp}=    GET On Session    ropa    /api/auth/me    headers=${headers}    expected_status=any
    Response Should Be Unauthorized    ${resp}

# ---------------------------------------------------------------------------
# TC-AUTH-007: เปลี่ยนรหัสผ่านสำเร็จ
# ---------------------------------------------------------------------------
TC-AUTH-007 Change Password Success
    [Documentation]    PUT /api/auth/change-password ด้วย current_password ถูกต้อง ต้องสำเร็จ
    [Tags]    auth    positive
    # สร้าง user ชั่วคราวสำหรับ test นี้
    ${admin_token}=    Get Auth Token    ${ADMIN_EMAIL}    ${ADMIN_PASSWORD}
    ${admin_headers}=    Auth Header    ${admin_token}
    ${unique}=    Generate Random String    6    [NUMBERS]
    ${test_email}=    Set Variable    changepw_${unique}@test.com
    ${user_body}=    Create Dictionary
    ...    email=${test_email}
    ...    name=Change PW Test
    ...    password=oldpassword123
    ...    role=Viewer_Auditor
    ${create_resp}=    POST On Session    ropa    /api/users    json=${user_body}    headers=${admin_headers}
    Response Should Be Created    ${create_resp}
    # Login ด้วย user ใหม่
    ${token}=    Get Auth Token    ${test_email}    oldpassword123
    ${headers}=    Auth Header    ${token}
    # เปลี่ยนรหัสผ่าน
    ${body}=    Create Dictionary    current_password=oldpassword123    new_password=newpassword456
    ${resp}=    PUT On Session    ropa    /api/auth/change-password    json=${body}    headers=${headers}
    Response Should Be OK    ${resp}
    Should Be Equal As Strings    ${resp.json()['message']}    เปลี่ยนรหัสผ่านสำเร็จ

# ---------------------------------------------------------------------------
# TC-AUTH-008: เปลี่ยนรหัสผ่านด้วย current_password ผิด ต้องได้ 400
# ---------------------------------------------------------------------------
TC-AUTH-008 Change Password With Wrong Current Password
    [Documentation]    PUT /api/auth/change-password ด้วย current_password ผิด ต้องได้ 400
    [Tags]    auth    negative
    ${token}=    Get Auth Token    ${ADMIN_EMAIL}    ${ADMIN_PASSWORD}
    ${headers}=    Auth Header    ${token}
    ${body}=    Create Dictionary    current_password=wrongcurrent    new_password=newpassword456
    ${resp}=    PUT On Session    ropa    /api/auth/change-password    json=${body}    headers=${headers}    expected_status=any
    Should Be Equal As Integers    ${resp.status_code}    400
    Should Be Equal As Strings    ${resp.json()['detail']}    รหัสผ่านปัจจุบันไม่ถูกต้อง

# ---------------------------------------------------------------------------
# TC-AUTH-009: Logout สำเร็จ
# ---------------------------------------------------------------------------
TC-AUTH-009 Logout Success
    [Documentation]    POST /api/auth/logout ต้องได้ message ยืนยัน
    [Tags]    auth    positive
    ${token}=    Get Auth Token    ${ADMIN_EMAIL}    ${ADMIN_PASSWORD}
    ${headers}=    Auth Header    ${token}
    ${resp}=    POST On Session    ropa    /api/auth/logout    headers=${headers}
    Response Should Be OK    ${resp}
    Should Be Equal As Strings    ${resp.json()['message']}    ออกจากระบบสำเร็จ
