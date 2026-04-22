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
# TC-DASH-001: GET /api/dashboard/summary
# ---------------------------------------------------------------------------
TC-DASH-001 Dashboard Summary
    [Documentation]    GET /api/dashboard/summary ต้องได้ข้อมูลสรุป
    [Tags]    dashboard    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/dashboard/summary    headers=${headers}
    Response Should Be OK    ${resp}
    Dictionary Should Contain Key    ${resp.json()}    total

# ---------------------------------------------------------------------------
# TC-DASH-002: GET /api/dashboard/completeness
# ---------------------------------------------------------------------------
TC-DASH-002 Dashboard Completeness
    [Documentation]    GET /api/dashboard/completeness ต้องได้อัตราความสมบูรณ์
    [Tags]    dashboard    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/dashboard/completeness    headers=${headers}
    Response Should Be OK    ${resp}

# ---------------------------------------------------------------------------
# TC-DASH-003: GET /api/dashboard/trends
# ---------------------------------------------------------------------------
TC-DASH-003 Dashboard Trends
    [Documentation]    GET /api/dashboard/trends ต้องได้แนวโน้มรายเดือน
    [Tags]    dashboard    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/dashboard/trends    headers=${headers}
    Response Should Be OK    ${resp}

# ---------------------------------------------------------------------------
# TC-DASH-004: GET /api/dashboard/risk-heatmap
# ---------------------------------------------------------------------------
TC-DASH-004 Dashboard Risk Heatmap
    [Documentation]    GET /api/dashboard/risk-heatmap ต้องได้ heatmap data
    [Tags]    dashboard    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/dashboard/risk-heatmap    headers=${headers}
    Response Should Be OK    ${resp}

# ---------------------------------------------------------------------------
# TC-DASH-005: GET /api/dashboard/compliance-scores
# ---------------------------------------------------------------------------
TC-DASH-005 Dashboard Compliance Scores
    [Documentation]    GET /api/dashboard/compliance-scores ต้องได้ compliance scores
    [Tags]    dashboard    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/dashboard/compliance-scores    headers=${headers}
    Response Should Be OK    ${resp}

# ---------------------------------------------------------------------------
# TC-DASH-006: GET /api/dashboard/status-overview
# ---------------------------------------------------------------------------
TC-DASH-006 Dashboard Status Overview
    [Documentation]    GET /api/dashboard/status-overview ต้องได้สรุปตามสถานะ
    [Tags]    dashboard    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/dashboard/status-overview    headers=${headers}
    Response Should Be OK    ${resp}

# ---------------------------------------------------------------------------
# TC-DASH-007: GET /api/dashboard/sensitive-data-mapping
# ---------------------------------------------------------------------------
TC-DASH-007 Dashboard Sensitive Data Mapping
    [Documentation]    GET /api/dashboard/sensitive-data-mapping ต้องได้ข้อมูล sensitive data
    [Tags]    dashboard    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/dashboard/sensitive-data-mapping    headers=${headers}
    Response Should Be OK    ${resp}

# ---------------------------------------------------------------------------
# TC-DASH-008: GET /api/dashboard/retention-alerts
# ---------------------------------------------------------------------------
TC-DASH-008 Dashboard Retention Alerts
    [Documentation]    GET /api/dashboard/retention-alerts ต้องได้สรุป retention alerts เป็นตัวเลข
    [Tags]    dashboard    positive    retention
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/dashboard/retention-alerts    headers=${headers}
    Response Should Be OK    ${resp}
    Dictionary Should Contain Key    ${resp.json()}    overdue
    Dictionary Should Contain Key    ${resp.json()}    within_30
    Dictionary Should Contain Key    ${resp.json()}    within_60_90
    Dictionary Should Contain Key    ${resp.json()}    review_overdue
    # ค่าต้องเป็นตัวเลข (int)
    ${overdue_type}=    Evaluate    type($resp.json()['overdue']).__name__
    Should Be Equal As Strings    ${overdue_type}    int

# ---------------------------------------------------------------------------
# TC-DASH-009: Dashboard โดยไม่มี token ต้องได้ 401
# ---------------------------------------------------------------------------
TC-DASH-009 Dashboard Without Token
    [Documentation]    GET /api/dashboard/summary โดยไม่มี token ต้องได้ 401
    [Tags]    dashboard    negative
    ${resp}=    GET On Session    ropa    /api/dashboard/summary    expected_status=any
    Response Should Be Unauthorized    ${resp}
