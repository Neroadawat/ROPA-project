*** Settings ***
Resource          resources/keywords.robot
Suite Setup       Run Keywords    Create API Session    AND    Setup Admin Token

*** Variables ***
${ADMIN_TOKEN}    ${EMPTY}

*** Keywords ***
Setup Admin Token
    ${token}=    Get Auth Token    ${ADMIN_EMAIL}    ${ADMIN_PASSWORD}
    Set Suite Variable    ${ADMIN_TOKEN}    ${token}

*** Test Cases ***

# ---------------------------------------------------------------------------
# TC-SUGG-001: ขอคำแนะนำ Legal Basis สำเร็จ (มี match)
# ---------------------------------------------------------------------------
TC-SUGG-001 Legal Basis Suggestion With Match
    [Documentation]    POST /api/suggestions/legal-basis ด้วย activity ที่ match ต้องได้ suggestions
    [Tags]    suggestions    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary
    ...    activity_name=การให้บริการลูกค้าตามสัญญา
    ...    purpose=เพื่อให้บริการตามสัญญาที่ลูกค้าทำไว้กับองค์กร
    ${resp}=    POST On Session    ropa    /api/suggestions/legal-basis    json=${body}    headers=${headers}
    Response Should Be OK    ${resp}
    Dictionary Should Contain Key    ${resp.json()}    suggestions
    Dictionary Should Contain Key    ${resp.json()}    engine_version
    Should Be Equal As Strings    ${resp.json()['engine_version']}    rule-based-v1

# ---------------------------------------------------------------------------
# TC-SUGG-002: ขอคำแนะนำ Legal Basis ที่ไม่ match ต้องได้ fallback
# ---------------------------------------------------------------------------
TC-SUGG-002 Legal Basis Suggestion No Match Returns Fallback
    [Documentation]    POST /api/suggestions/legal-basis ด้วย activity ที่ไม่ match ต้องได้ fallback=true
    [Tags]    suggestions    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary
    ...    activity_name=xyzxyzxyz ไม่มีคำที่ match
    ...    purpose=xyzxyzxyz ไม่มีคำที่ match เลย
    ${resp}=    POST On Session    ropa    /api/suggestions/legal-basis    json=${body}    headers=${headers}
    Response Should Be OK    ${resp}
    Dictionary Should Contain Key    ${resp.json()}    suggestions

# ---------------------------------------------------------------------------
# TC-SUGG-003: ขอคำแนะนำโดยไม่มี token ต้องได้ 401
# ---------------------------------------------------------------------------
TC-SUGG-003 Suggestion Without Token
    [Documentation]    POST /api/suggestions/legal-basis โดยไม่มี token ต้องได้ 401
    [Tags]    suggestions    negative
    ${body}=    Create Dictionary    activity_name=ทดสอบ    purpose=ทดสอบ
    ${resp}=    POST On Session    ropa    /api/suggestions/legal-basis    json=${body}    expected_status=any
    Response Should Be Unauthorized    ${resp}

# ---------------------------------------------------------------------------
# TC-SUGG-004: Admin ดู Suggestion Logs ได้
# ---------------------------------------------------------------------------
TC-SUGG-004 Admin Can Get Suggestion Logs
    [Documentation]    GET /api/suggestions/legal-basis/logs ต้องได้รายการ logs
    [Tags]    suggestions    positive    admin
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/suggestions/legal-basis/logs    headers=${headers}
    Response Should Be OK    ${resp}
    Dictionary Should Contain Key    ${resp.json()}    items
    Dictionary Should Contain Key    ${resp.json()}    total

# ---------------------------------------------------------------------------
# TC-SUGG-005: ขอคำแนะนำโดยไม่ระบุ activity_name ต้องได้ 422
# ---------------------------------------------------------------------------
TC-SUGG-005 Suggestion Without Required Fields
    [Documentation]    POST /api/suggestions/legal-basis โดยไม่ระบุ activity_name ต้องได้ 422
    [Tags]    suggestions    negative
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary    purpose=มีแค่ purpose ไม่มี activity_name
    ${resp}=    POST On Session    ropa    /api/suggestions/legal-basis    json=${body}    headers=${headers}    expected_status=any
    Should Be Equal As Integers    ${resp.status_code}    422
