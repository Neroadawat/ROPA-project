*** Settings ***
Resource          resources/keywords.robot
Suite Setup       Run Keywords    Create API Session    AND    Setup Admin Token

*** Variables ***
${ADMIN_TOKEN}      ${EMPTY}
${CREATED_DSC_ID}   ${EMPTY}
${CREATED_PDT_ID}   ${EMPTY}

*** Keywords ***
Setup Admin Token
    ${token}=    Get Auth Token    ${ADMIN_EMAIL}    ${ADMIN_PASSWORD}
    Set Suite Variable    ${ADMIN_TOKEN}    ${token}

*** Test Cases ***

# ---------------------------------------------------------------------------
# TC-MD-001: ดูรายการ Data Subject Categories
# ---------------------------------------------------------------------------
TC-MD-001 List Data Subject Categories
    [Documentation]    GET /api/master-data/data-subject-categories ต้องได้รายการ
    [Tags]    master-data    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/master-data/data-subject-categories    headers=${headers}
    Response Should Be OK    ${resp}
    Dictionary Should Contain Key    ${resp.json()}    items
    Dictionary Should Contain Key    ${resp.json()}    total

# ---------------------------------------------------------------------------
# TC-MD-002: Admin สร้าง Data Subject Category ใหม่ได้
# ---------------------------------------------------------------------------
TC-MD-002 Admin Can Create Data Subject Category
    [Documentation]    POST /api/master-data/data-subject-categories ต้องสร้างสำเร็จ
    [Tags]    master-data    positive    admin
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${unique}=    Generate Random String    6    [NUMBERS]
    ${body}=    Create Dictionary
    ...    name=กลุ่มทดสอบ ${unique}
    ...    description=คำอธิบายกลุ่มทดสอบ
    ${resp}=    POST On Session    ropa    /api/master-data/data-subject-categories    json=${body}    headers=${headers}
    Response Should Be Created    ${resp}
    Should Be Equal As Strings    ${resp.json()['name']}    กลุ่มทดสอบ ${unique}
    Set Suite Variable    ${CREATED_DSC_ID}    ${resp.json()['id']}

# ---------------------------------------------------------------------------
# TC-MD-003: Admin แก้ไข Data Subject Category ได้
# ---------------------------------------------------------------------------
TC-MD-003 Admin Can Update Data Subject Category
    [Documentation]    PUT /api/master-data/data-subject-categories/{id} ต้องอัปเดตสำเร็จ
    [Tags]    master-data    positive    admin
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${unique}=    Generate Random String    6    [NUMBERS]
    ${body}=    Create Dictionary    name=กลุ่มทดสอบ แก้ไข ${unique}    description=คำอธิบายใหม่
    ${resp}=    PUT On Session    ropa    /api/master-data/data-subject-categories/${CREATED_DSC_ID}    json=${body}    headers=${headers}
    Response Should Be OK    ${resp}
    Should Contain    ${resp.json()['name']}    กลุ่มทดสอบ แก้ไข

# ---------------------------------------------------------------------------
# TC-MD-004: Admin ลบ Data Subject Category ได้
# ---------------------------------------------------------------------------
TC-MD-004 Admin Can Delete Data Subject Category
    [Documentation]    DELETE /api/master-data/data-subject-categories/{id} ต้องลบสำเร็จ
    [Tags]    master-data    positive    admin
    # สร้างใหม่สำหรับลบ
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${unique}=    Generate Random String    6    [NUMBERS]
    ${body}=    Create Dictionary    name=กลุ่มสำหรับลบ ${unique}
    ${create_resp}=    POST On Session    ropa    /api/master-data/data-subject-categories    json=${body}    headers=${headers}
    ${dsc_id}=    Set Variable    ${create_resp.json()['id']}
    ${resp}=    DELETE On Session    ropa    /api/master-data/data-subject-categories/${dsc_id}    headers=${headers}
    Should Be Equal As Integers    ${resp.status_code}    204

# ---------------------------------------------------------------------------
# TC-MD-005: ดูรายการ Personal Data Types
# ---------------------------------------------------------------------------
TC-MD-005 List Personal Data Types
    [Documentation]    GET /api/master-data/personal-data-types ต้องได้รายการ
    [Tags]    master-data    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/master-data/personal-data-types    headers=${headers}
    Response Should Be OK    ${resp}
    Dictionary Should Contain Key    ${resp.json()}    items

# ---------------------------------------------------------------------------
# TC-MD-006: Admin สร้าง Personal Data Type ใหม่ได้
# ---------------------------------------------------------------------------
TC-MD-006 Admin Can Create Personal Data Type
    [Documentation]    POST /api/master-data/personal-data-types ต้องสร้างสำเร็จ
    [Tags]    master-data    positive    admin
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${unique}=    Generate Random String    6    [NUMBERS]
    ${body}=    Create Dictionary
    ...    name=ข้อมูลทดสอบ ${unique}
    ...    category=เอกสารทดสอบ
    ...    sensitivity_level=general
    ${resp}=    POST On Session    ropa    /api/master-data/personal-data-types    json=${body}    headers=${headers}
    Response Should Be Created    ${resp}
    Should Be Equal As Strings    ${resp.json()['sensitivity_level']}    general
    Set Suite Variable    ${CREATED_PDT_ID}    ${resp.json()['id']}

# ---------------------------------------------------------------------------
# TC-MD-007: Admin แก้ไข Personal Data Type ได้
# ---------------------------------------------------------------------------
TC-MD-007 Admin Can Update Personal Data Type
    [Documentation]    PUT /api/master-data/personal-data-types/{id} ต้องอัปเดตสำเร็จ
    [Tags]    master-data    positive    admin
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${unique}=    Generate Random String    6    [NUMBERS]
    ${body}=    Create Dictionary
    ...    name=ข้อมูลทดสอบ แก้ไข ${unique}
    ...    sensitivity_level=sensitive
    ${resp}=    PUT On Session    ropa    /api/master-data/personal-data-types/${CREATED_PDT_ID}    json=${body}    headers=${headers}
    Response Should Be OK    ${resp}
    Should Be Equal As Strings    ${resp.json()['sensitivity_level']}    sensitive

# ---------------------------------------------------------------------------
# TC-MD-008: ดูรายการ Master Data โดยไม่มี token ต้องได้ 401
# ---------------------------------------------------------------------------
TC-MD-008 List Master Data Without Token
    [Documentation]    GET /api/master-data/data-subject-categories โดยไม่มี token ต้องได้ 401
    [Tags]    master-data    negative
    ${resp}=    GET On Session    ropa    /api/master-data/data-subject-categories    expected_status=any
    Response Should Be Unauthorized    ${resp}
