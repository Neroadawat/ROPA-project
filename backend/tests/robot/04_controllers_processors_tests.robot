*** Settings ***
Resource          resources/keywords.robot
Suite Setup       Run Keywords    Create API Session    AND    Setup Admin Token

*** Variables ***
${ADMIN_TOKEN}          ${EMPTY}
${CREATED_CTRL_ID}      ${EMPTY}
${CREATED_PROC_ID}      ${EMPTY}

*** Keywords ***
Setup Admin Token
    ${token}=    Get Auth Token    ${ADMIN_EMAIL}    ${ADMIN_PASSWORD}
    Set Suite Variable    ${ADMIN_TOKEN}    ${token}

*** Test Cases ***

# ---------------------------------------------------------------------------
# TC-CTRL-001: ดูรายการ Controllers
# ---------------------------------------------------------------------------
TC-CTRL-001 List Controllers
    [Documentation]    GET /api/controllers ต้องได้รายการ controllers
    [Tags]    controllers    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/controllers    headers=${headers}
    Response Should Be OK    ${resp}
    Dictionary Should Contain Key    ${resp.json()}    items
    Dictionary Should Contain Key    ${resp.json()}    total

# ---------------------------------------------------------------------------
# TC-CTRL-002: Admin สร้าง Controller ใหม่ได้
# ---------------------------------------------------------------------------
TC-CTRL-002 Admin Can Create Controller
    [Documentation]    POST /api/controllers ต้องสร้างสำเร็จ
    [Tags]    controllers    positive    admin
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${unique}=    Generate Random String    6    [NUMBERS]
    ${body}=    Create Dictionary
    ...    name=บริษัท ทดสอบ ${unique} จำกัด
    ...    address=123 ถนนทดสอบ
    ...    email=test${unique}@company.com
    ...    phone=02-000-${unique}
    ${resp}=    POST On Session    ropa    /api/controllers    json=${body}    headers=${headers}
    Response Should Be Created    ${resp}
    Dictionary Should Contain Key    ${resp.json()}    id
    Should Be Equal As Strings    ${resp.json()['is_active']}    True
    Set Suite Variable    ${CREATED_CTRL_ID}    ${resp.json()['id']}

# ---------------------------------------------------------------------------
# TC-CTRL-003: Admin แก้ไข Controller ได้
# ---------------------------------------------------------------------------
TC-CTRL-003 Admin Can Update Controller
    [Documentation]    PUT /api/controllers/{id} ต้องอัปเดตสำเร็จ
    [Tags]    controllers    positive    admin
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary    name=บริษัท ทดสอบ (แก้ไขแล้ว) จำกัด
    ${resp}=    PUT On Session    ropa    /api/controllers/${CREATED_CTRL_ID}    json=${body}    headers=${headers}
    Response Should Be OK    ${resp}
    Should Be Equal As Strings    ${resp.json()['name']}    บริษัท ทดสอบ (แก้ไขแล้ว) จำกัด

# ---------------------------------------------------------------------------
# TC-CTRL-004: Admin Deactivate Controller ได้
# ---------------------------------------------------------------------------
TC-CTRL-004 Admin Can Deactivate Controller
    [Documentation]    DELETE /api/controllers/{id} ต้อง deactivate สำเร็จ
    [Tags]    controllers    positive    admin
    # สร้าง controller ใหม่สำหรับ deactivate
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${unique}=    Generate Random String    6    [NUMBERS]
    ${body}=    Create Dictionary    name=Controller สำหรับลบ ${unique}
    ${create_resp}=    POST On Session    ropa    /api/controllers    json=${body}    headers=${headers}
    ${ctrl_id}=    Set Variable    ${create_resp.json()['id']}
    ${resp}=    DELETE On Session    ropa    /api/controllers/${ctrl_id}    headers=${headers}
    Should Be Equal As Integers    ${resp.status_code}    204

# ---------------------------------------------------------------------------
# TC-PROC-001: ดูรายการ Processors
# ---------------------------------------------------------------------------
TC-PROC-001 List Processors
    [Documentation]    GET /api/processors ต้องได้รายการ processors
    [Tags]    processors    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/processors    headers=${headers}
    Response Should Be OK    ${resp}
    Dictionary Should Contain Key    ${resp.json()}    items

# ---------------------------------------------------------------------------
# TC-PROC-002: Admin สร้าง Processor ใหม่ได้
# ---------------------------------------------------------------------------
TC-PROC-002 Admin Can Create Processor
    [Documentation]    POST /api/processors ต้องสร้างสำเร็จ
    [Tags]    processors    positive    admin
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${unique}=    Generate Random String    6    [NUMBERS]
    ${body}=    Create Dictionary
    ...    name=บริษัท Processor ${unique} จำกัด
    ...    source_controller_id=${CREATED_CTRL_ID}
    ...    data_category=general
    ...    address=456 ถนนทดสอบ
    ...    email=proc${unique}@company.com
    ${resp}=    POST On Session    ropa    /api/processors    json=${body}    headers=${headers}
    Response Should Be Created    ${resp}
    Should Be Equal As Strings    ${resp.json()['data_category']}    general
    Set Suite Variable    ${CREATED_PROC_ID}    ${resp.json()['id']}

# ---------------------------------------------------------------------------
# TC-PROC-003: Admin แก้ไข Processor ได้
# ---------------------------------------------------------------------------
TC-PROC-003 Admin Can Update Processor
    [Documentation]    PUT /api/processors/{id} ต้องอัปเดตสำเร็จ
    [Tags]    processors    positive    admin
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary
    ...    name=บริษัท Processor (แก้ไขแล้ว) จำกัด
    ...    source_controller_id=${CREATED_CTRL_ID}
    ${resp}=    PUT On Session    ropa    /api/processors/${CREATED_PROC_ID}    json=${body}    headers=${headers}
    Response Should Be OK    ${resp}
    Should Be Equal As Strings    ${resp.json()['name']}    บริษัท Processor (แก้ไขแล้ว) จำกัด
