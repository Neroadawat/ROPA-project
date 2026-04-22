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
# TC-AUDIT-001: Admin ดู Audit Logs ได้
# ---------------------------------------------------------------------------
TC-AUDIT-001 Admin Can List Audit Logs
    [Documentation]    GET /api/audit-logs ต้องได้รายการ audit logs
    [Tags]    audit    positive    admin
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/audit-logs    headers=${headers}
    Response Should Be OK    ${resp}
    Dictionary Should Contain Key    ${resp.json()}    items
    Dictionary Should Contain Key    ${resp.json()}    total

# ---------------------------------------------------------------------------
# TC-AUDIT-002: Filter Audit Logs ตาม action
# ---------------------------------------------------------------------------
TC-AUDIT-002 Filter Audit Logs By Action
    [Documentation]    GET /api/audit-logs?action=create ต้องกรองได้
    [Tags]    audit    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${params}=    Create Dictionary    action=create
    ${resp}=    GET On Session    ropa    /api/audit-logs    headers=${headers}    params=${params}
    Response Should Be OK    ${resp}
    # ทุก item ต้องมี action = create
    FOR    ${item}    IN    @{resp.json()['items']}
        Should Be Equal As Strings    ${item['action']}    create
    END

# ---------------------------------------------------------------------------
# TC-AUDIT-003: Audit Logs โดยไม่มี token ต้องได้ 401
# ---------------------------------------------------------------------------
TC-AUDIT-003 Audit Logs Without Token
    [Documentation]    GET /api/audit-logs โดยไม่มี token ต้องได้ 401
    [Tags]    audit    negative
    ${resp}=    GET On Session    ropa    /api/audit-logs    expected_status=any
    Response Should Be Unauthorized    ${resp}

# ---------------------------------------------------------------------------
# TC-AUDIT-004: Non-admin ดู Audit Logs ไม่ได้ ต้องได้ 403
# ---------------------------------------------------------------------------
TC-AUDIT-004 Non-Admin Cannot List Audit Logs
    [Documentation]    GET /api/audit-logs โดยไม่ใช่ Admin ต้องได้ 403
    [Tags]    audit    negative    rbac
    ${admin_headers}=    Auth Header    ${ADMIN_TOKEN}
    ${unique}=    Generate Random String    6    [NUMBERS]
    ${body}=    Create Dictionary
    ...    email=viewer_audit_${unique}@test.com
    ...    name=Viewer Audit Test
    ...    password=viewerpass123
    ...    role=Viewer_Auditor
    POST On Session    ropa    /api/users    json=${body}    headers=${admin_headers}
    ${viewer_token}=    Get Auth Token    viewer_audit_${unique}@test.com    viewerpass123
    ${viewer_headers}=    Auth Header    ${viewer_token}
    ${resp}=    GET On Session    ropa    /api/audit-logs    headers=${viewer_headers}    expected_status=any
    Response Should Be Forbidden    ${resp}

# ---------------------------------------------------------------------------
# TC-AUDIT-005: Admin ดู User Session Logs ได้
# ---------------------------------------------------------------------------
TC-AUDIT-005 Admin Can List User Session Logs
    [Documentation]    GET /api/user-logs ต้องได้รายการ session logs
    [Tags]    audit    positive    admin
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/user-logs    headers=${headers}
    Response Should Be OK    ${resp}
    Dictionary Should Contain Key    ${resp.json()}    items
    Dictionary Should Contain Key    ${resp.json()}    total

# ---------------------------------------------------------------------------
# TC-AUDIT-006: Filter User Session Logs ตาม action=login
# ---------------------------------------------------------------------------
TC-AUDIT-006 Filter Session Logs By Login Action
    [Documentation]    GET /api/user-logs?action=login ต้องกรองได้
    [Tags]    audit    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${params}=    Create Dictionary    action=login
    ${resp}=    GET On Session    ropa    /api/user-logs    headers=${headers}    params=${params}
    Response Should Be OK    ${resp}
    FOR    ${item}    IN    @{resp.json()['items']}
        Should Be Equal As Strings    ${item['action']}    login
    END

# ---------------------------------------------------------------------------
# TC-AUDIT-007: User Session Logs โดยไม่มี token ต้องได้ 401
# ---------------------------------------------------------------------------
TC-AUDIT-007 Session Logs Without Token
    [Documentation]    GET /api/user-logs โดยไม่มี token ต้องได้ 401
    [Tags]    audit    negative
    ${resp}=    GET On Session    ropa    /api/user-logs    expected_status=any
    Response Should Be Unauthorized    ${resp}
