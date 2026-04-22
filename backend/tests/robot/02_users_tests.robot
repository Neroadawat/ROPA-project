*** Settings ***
Resource          resources/keywords.robot
Suite Setup       Run Keywords    Create API Session    AND    Setup Admin Token

*** Variables ***
${ADMIN_TOKEN}      ${EMPTY}
${CREATED_USER_ID}  ${EMPTY}

*** Keywords ***
Setup Admin Token
    ${token}=    Get Auth Token    ${ADMIN_EMAIL}    ${ADMIN_PASSWORD}
    Set Suite Variable    ${ADMIN_TOKEN}    ${token}

*** Test Cases ***

# ---------------------------------------------------------------------------
# TC-USER-001: Admin ดูรายการ users ได้
# ---------------------------------------------------------------------------
TC-USER-001 Admin Can List Users
    [Documentation]    GET /api/users ด้วย Admin token ต้องได้รายการ users
    [Tags]    users    positive    admin
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/users    headers=${headers}
    Response Should Be OK    ${resp}
    Dictionary Should Contain Key    ${resp.json()}    items
    Dictionary Should Contain Key    ${resp.json()}    total

# ---------------------------------------------------------------------------
# TC-USER-002: Admin สร้าง user ใหม่ได้
# ---------------------------------------------------------------------------
TC-USER-002 Admin Can Create User
    [Documentation]    POST /api/users ด้วย Admin token ต้องสร้าง user สำเร็จ
    [Tags]    users    positive    admin
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${unique}=    Generate Random String    6    [NUMBERS]
    ${body}=    Create Dictionary
    ...    email=testuser_${unique}@example.com
    ...    name=Test User ${unique}
    ...    password=testpassword123
    ...    role=Viewer_Auditor
    ${resp}=    POST On Session    ropa    /api/users    json=${body}    headers=${headers}
    Response Should Be Created    ${resp}
    Should Be Equal As Strings    ${resp.json()['role']}    Viewer_Auditor
    Should Be Equal As Strings    ${resp.json()['is_active']}    True
    Set Suite Variable    ${CREATED_USER_ID}    ${resp.json()['id']}

# ---------------------------------------------------------------------------
# TC-USER-003: Admin ดูรายละเอียด user ได้
# ---------------------------------------------------------------------------
TC-USER-003 Admin Can Get User By ID
    [Documentation]    GET /api/users/{id} ต้องได้ข้อมูล user ที่ถูกต้อง
    [Tags]    users    positive    admin
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/users/${CREATED_USER_ID}    headers=${headers}
    Response Should Be OK    ${resp}
    Should Be Equal As Integers    ${resp.json()['id']}    ${CREATED_USER_ID}

# ---------------------------------------------------------------------------
# TC-USER-004: Admin แก้ไข user ได้
# ---------------------------------------------------------------------------
TC-USER-004 Admin Can Update User
    [Documentation]    PUT /api/users/{id} ต้องอัปเดตข้อมูล user สำเร็จ
    [Tags]    users    positive    admin
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary    name=Updated Name
    ${resp}=    PUT On Session    ropa    /api/users/${CREATED_USER_ID}    json=${body}    headers=${headers}
    Response Should Be OK    ${resp}
    Should Be Equal As Strings    ${resp.json()['name']}    Updated Name

# ---------------------------------------------------------------------------
# TC-USER-005: สร้าง user ด้วย email ซ้ำ ต้องได้ 409
# ---------------------------------------------------------------------------
TC-USER-005 Create User With Duplicate Email
    [Documentation]    POST /api/users ด้วย email ที่มีอยู่แล้ว ต้องได้ 409
    [Tags]    users    negative
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary
    ...    email=${ADMIN_EMAIL}
    ...    name=Duplicate User
    ...    password=testpassword123
    ...    role=Viewer_Auditor
    ${resp}=    POST On Session    ropa    /api/users    json=${body}    headers=${headers}    expected_status=any
    Should Be Equal As Integers    ${resp.status_code}    409

# ---------------------------------------------------------------------------
# TC-USER-006: ดู user ที่ไม่มีอยู่ ต้องได้ 404
# ---------------------------------------------------------------------------
TC-USER-006 Get Non-Existent User
    [Documentation]    GET /api/users/99999 ต้องได้ 404
    [Tags]    users    negative
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/users/99999    headers=${headers}    expected_status=any
    Response Should Be Not Found    ${resp}

# ---------------------------------------------------------------------------
# TC-USER-007: Admin ปิดการใช้งาน user ได้ (soft delete)
# ---------------------------------------------------------------------------
TC-USER-007 Admin Can Deactivate User
    [Documentation]    DELETE /api/users/{id} ต้อง set is_active=false
    [Tags]    users    positive    admin
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    DELETE On Session    ropa    /api/users/${CREATED_USER_ID}    headers=${headers}
    Response Should Be OK    ${resp}
    Should Be Equal As Strings    ${resp.json()['is_active']}    False

# ---------------------------------------------------------------------------
# TC-USER-008: Non-admin ดูรายการ users ไม่ได้ ต้องได้ 403
# ---------------------------------------------------------------------------
TC-USER-008 Non-Admin Cannot List Users
    [Documentation]    GET /api/users โดยไม่ใช่ Admin ต้องได้ 403
    [Tags]    users    negative    rbac
    # สร้าง viewer user ก่อน
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${unique}=    Generate Random String    6    [NUMBERS]
    ${body}=    Create Dictionary
    ...    email=viewer_${unique}@example.com
    ...    name=Viewer ${unique}
    ...    password=viewerpass123
    ...    role=Viewer_Auditor
    ${create_resp}=    POST On Session    ropa    /api/users    json=${body}    headers=${headers}
    ${viewer_token}=    Get Auth Token    viewer_${unique}@example.com    viewerpass123
    ${viewer_headers}=    Auth Header    ${viewer_token}
    ${resp}=    GET On Session    ropa    /api/users    headers=${viewer_headers}    expected_status=any
    Response Should Be Forbidden    ${resp}
