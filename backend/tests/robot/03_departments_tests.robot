*** Settings ***
Resource          resources/keywords.robot
Suite Setup       Run Keywords    Create API Session    AND    Setup Admin Token

*** Variables ***
${ADMIN_TOKEN}      ${EMPTY}
${CREATED_DEPT_ID}  ${EMPTY}
${DEPT_CODE}        ${EMPTY}

*** Keywords ***
Setup Admin Token
    ${token}=    Get Auth Token    ${ADMIN_EMAIL}    ${ADMIN_PASSWORD}
    Set Suite Variable    ${ADMIN_TOKEN}    ${token}

*** Test Cases ***

# ---------------------------------------------------------------------------
# TC-DEPT-001: ดูรายการแผนก (Authenticated)
# ---------------------------------------------------------------------------
TC-DEPT-001 List Departments
    [Documentation]    GET /api/departments ต้องได้รายการแผนก
    [Tags]    departments    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/departments    headers=${headers}
    Response Should Be OK    ${resp}
    Dictionary Should Contain Key    ${resp.json()}    items
    Dictionary Should Contain Key    ${resp.json()}    total

# ---------------------------------------------------------------------------
# TC-DEPT-002: Admin สร้างแผนกใหม่ได้
# ---------------------------------------------------------------------------
TC-DEPT-002 Admin Can Create Department
    [Documentation]    POST /api/departments ต้องสร้างแผนกสำเร็จ
    [Tags]    departments    positive    admin
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${unique}=    Generate Random String    4    [UPPER]
    ${code}=    Set Variable    TEST${unique}
    Set Suite Variable    ${DEPT_CODE}    ${code}
    ${body}=    Create Dictionary    name=แผนกทดสอบ ${unique}    code=${code}
    ${resp}=    POST On Session    ropa    /api/departments    json=${body}    headers=${headers}
    Response Should Be Created    ${resp}
    Should Be Equal As Strings    ${resp.json()['code']}    ${code}
    Should Be Equal As Strings    ${resp.json()['is_active']}    True
    Set Suite Variable    ${CREATED_DEPT_ID}    ${resp.json()['id']}

# ---------------------------------------------------------------------------
# TC-DEPT-003: Admin แก้ไขแผนกได้
# ---------------------------------------------------------------------------
TC-DEPT-003 Admin Can Update Department
    [Documentation]    PUT /api/departments/{id} ต้องอัปเดตสำเร็จ
    [Tags]    departments    positive    admin
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary    name=แผนกทดสอบ (แก้ไขแล้ว)    code=${DEPT_CODE}
    ${resp}=    PUT On Session    ropa    /api/departments/${CREATED_DEPT_ID}    json=${body}    headers=${headers}
    Response Should Be OK    ${resp}
    Should Be Equal As Strings    ${resp.json()['name']}    แผนกทดสอบ (แก้ไขแล้ว)

# ---------------------------------------------------------------------------
# TC-DEPT-004: สร้างแผนกด้วย code ซ้ำ ต้องได้ 409
# ---------------------------------------------------------------------------
TC-DEPT-004 Create Department With Duplicate Code
    [Documentation]    POST /api/departments ด้วย code ซ้ำ ต้องได้ 409
    [Tags]    departments    negative
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary    name=แผนกซ้ำ    code=${DEPT_CODE}
    ${resp}=    POST On Session    ropa    /api/departments    json=${body}    headers=${headers}    expected_status=any
    Should Be Equal As Integers    ${resp.status_code}    409

# ---------------------------------------------------------------------------
# TC-DEPT-005: Admin ลบแผนกที่ไม่มี ROPA ผูกอยู่ได้
# ---------------------------------------------------------------------------
TC-DEPT-005 Admin Can Delete Empty Department
    [Documentation]    DELETE /api/departments/{id} แผนกที่ไม่มี ROPA ต้องลบสำเร็จ
    [Tags]    departments    positive    admin
    # สร้างแผนกใหม่สำหรับลบ
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${unique}=    Generate Random String    4    [UPPER]
    ${body}=    Create Dictionary    name=แผนกสำหรับลบ    code=DEL${unique}
    ${create_resp}=    POST On Session    ropa    /api/departments    json=${body}    headers=${headers}
    ${dept_id}=    Set Variable    ${create_resp.json()['id']}
    # ลบ
    ${resp}=    DELETE On Session    ropa    /api/departments/${dept_id}    headers=${headers}
    Should Be Equal As Integers    ${resp.status_code}    204

# ---------------------------------------------------------------------------
# TC-DEPT-006: ดูรายการแผนกโดยไม่มี token ต้องได้ 401
# ---------------------------------------------------------------------------
TC-DEPT-006 List Departments Without Token
    [Documentation]    GET /api/departments โดยไม่มี token ต้องได้ 401
    [Tags]    departments    negative
    ${resp}=    GET On Session    ropa    /api/departments    expected_status=any
    Response Should Be Unauthorized    ${resp}
