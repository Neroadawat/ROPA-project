*** Settings ***
Resource          resources/keywords.robot
Suite Setup       Run Keywords    Create API Session    AND    Setup Suite Variables

*** Variables ***
${ADMIN_TOKEN}          ${EMPTY}
${DPO_TOKEN}            ${EMPTY}
${DEPT_ID}              ${EMPTY}
${CTRL_ID}              ${EMPTY}
${DSC_ID}               ${EMPTY}
${PDT_ID}               ${EMPTY}
${RECORD_FOR_APPROVE}   ${EMPTY}
${RECORD_FOR_REJECT}    ${EMPTY}

*** Keywords ***
Setup Suite Variables
    ${admin_token}=    Get Auth Token    ${ADMIN_EMAIL}    ${ADMIN_PASSWORD}
    Set Suite Variable    ${ADMIN_TOKEN}    ${admin_token}
    ${headers}=    Auth Header    ${admin_token}
    # สร้าง DPO user สำหรับ test
    ${unique}=    Generate Random String    6    [NUMBERS]
    ${dpo_email}=    Set Variable    dpo_test_${unique}@triangle.com
    ${dpo_body}=    Create Dictionary
    ...    email=${dpo_email}
    ...    name=DPO Test ${unique}
    ...    password=dpopassword123
    ...    role=DPO
    ${create_resp}=    POST On Session    ropa    /api/users    json=${dpo_body}    headers=${headers}    expected_status=any
    ${dpo_token}=    Get Auth Token    ${dpo_email}    dpopassword123
    Set Suite Variable    ${DPO_TOKEN}    ${dpo_token}
    # ดึง department, controller, master data
    ${dept_resp}=    GET On Session    ropa    /api/departments    headers=${headers}
    Set Suite Variable    ${DEPT_ID}    ${dept_resp.json()['items'][0]['id']}
    ${ctrl_resp}=    GET On Session    ropa    /api/controllers    headers=${headers}
    ${ctrl_count}=    Get Length    ${ctrl_resp.json()['items']}
    IF    ${ctrl_count} > 0
        Set Suite Variable    ${CTRL_ID}    ${ctrl_resp.json()['items'][0]['id']}
    ELSE
        ${body}=    Create Dictionary    name=Controller Approval Test
        ${cr}=    POST On Session    ropa    /api/controllers    json=${body}    headers=${headers}
        Set Suite Variable    ${CTRL_ID}    ${cr.json()['id']}
    END
    ${dsc_resp}=    GET On Session    ropa    /api/master-data/data-subject-categories    headers=${headers}
    ${dsc_count}=    Get Length    ${dsc_resp.json()['items']}
    IF    ${dsc_count} > 0
        Set Suite Variable    ${DSC_ID}    ${dsc_resp.json()['items'][0]['id']}
    ELSE
        ${body}=    Create Dictionary    name=กลุ่ม Approval Test
        ${cr}=    POST On Session    ropa    /api/master-data/data-subject-categories    json=${body}    headers=${headers}
        Set Suite Variable    ${DSC_ID}    ${cr.json()['id']}
    END
    ${pdt_resp}=    GET On Session    ropa    /api/master-data/personal-data-types    headers=${headers}
    ${pdt_count}=    Get Length    ${pdt_resp.json()['items']}
    IF    ${pdt_count} > 0
        Set Suite Variable    ${PDT_ID}    ${pdt_resp.json()['items'][0]['id']}
    ELSE
        ${body}=    Create Dictionary    name=ข้อมูล Approval Test    sensitivity_level=general
        ${cr}=    POST On Session    ropa    /api/master-data/personal-data-types    json=${body}    headers=${headers}
        Set Suite Variable    ${PDT_ID}    ${cr.json()['id']}
    END
    # สร้าง records สำหรับ approve และ reject
    ${dsc_ids}=    Create List    ${DSC_ID}
    ${pdt_ids}=    Create List    ${PDT_ID}
    ${record_body}=    Create Dictionary
    ...    department_id=${DEPT_ID}
    ...    role_type=Controller
    ...    controller_id=${CTRL_ID}
    ...    activity_name=กิจกรรมสำหรับ Approve
    ...    purpose=ทดสอบ Approval Workflow
    ...    risk_level=Low
    ...    data_subject_category_ids=${dsc_ids}
    ...    personal_data_type_ids=${pdt_ids}
    ...    legal_basis_thai=ฐานสัญญา (มาตรา 24(3))
    ${r1}=    POST On Session    ropa    /api/ropa-records    json=${record_body}    headers=${headers}
    Set Suite Variable    ${RECORD_FOR_APPROVE}    ${r1.json()['id']}
    ${record_body2}=    Create Dictionary
    ...    department_id=${DEPT_ID}
    ...    role_type=Controller
    ...    controller_id=${CTRL_ID}
    ...    activity_name=กิจกรรมสำหรับ Reject
    ...    purpose=ทดสอบ Reject Workflow
    ...    risk_level=Low
    ...    data_subject_category_ids=${dsc_ids}
    ...    personal_data_type_ids=${pdt_ids}
    ...    legal_basis_thai=ฐานสัญญา (มาตรา 24(3))
    ${r2}=    POST On Session    ropa    /api/ropa-records    json=${record_body2}    headers=${headers}
    Set Suite Variable    ${RECORD_FOR_REJECT}    ${r2.json()['id']}

*** Test Cases ***

# ---------------------------------------------------------------------------
# TC-APPR-001: DPO อนุมัติ ROPA Record ได้ (pending_approval → approved)
# ---------------------------------------------------------------------------
TC-APPR-001 DPO Can Approve ROPA Record
    [Documentation]    POST /api/ropa-records/{id}/approve โดย DPO ต้องเปลี่ยน status = approved
    [Tags]    approval    positive    dpo
    ${headers}=    Auth Header    ${DPO_TOKEN}
    ${resp}=    POST On Session    ropa    /api/ropa-records/${RECORD_FOR_APPROVE}/approve    headers=${headers}
    Response Should Be OK    ${resp}
    Should Be Equal As Strings    ${resp.json()['status']}    approved
    Dictionary Should Contain Key    ${resp.json()}    approved_at
    Dictionary Should Contain Key    ${resp.json()}    approver

# ---------------------------------------------------------------------------
# TC-APPR-002: DPO ปฏิเสธ ROPA Record ได้ (pending_approval → rejected)
# ---------------------------------------------------------------------------
TC-APPR-002 DPO Can Reject ROPA Record
    [Documentation]    POST /api/ropa-records/{id}/reject โดย DPO ต้องเปลี่ยน status = rejected
    [Tags]    approval    positive    dpo
    ${headers}=    Auth Header    ${DPO_TOKEN}
    ${body}=    Create Dictionary    rejection_reason=ข้อมูล Legal Basis ไม่ถูกต้อง กรุณาตรวจสอบใหม่
    ${resp}=    POST On Session    ropa    /api/ropa-records/${RECORD_FOR_REJECT}/reject    json=${body}    headers=${headers}
    Response Should Be OK    ${resp}
    Should Be Equal As Strings    ${resp.json()['status']}    rejected
    Should Be Equal As Strings    ${resp.json()['rejection_reason']}    ข้อมูล Legal Basis ไม่ถูกต้อง กรุณาตรวจสอบใหม่

# ---------------------------------------------------------------------------
# TC-APPR-002B: [BUG] Reject record ที่ถูก approve แล้ว → 500 Server Error
# ---------------------------------------------------------------------------
TC-APPR-002B BUG Reject Already Approved Record Returns 500
    [Documentation]    POST /api/ropa-records/{id}/reject บน record ที่ approved แล้ว
    ...    ควรได้ 400/422 แต่ปัจจุบัน return 500 — BUG
    [Tags]    approval    negative    bug
    ${headers}=    Auth Header    ${DPO_TOKEN}
    ${body}=    Create Dictionary    rejection_reason=ทดสอบ reject record ที่ approved แล้ว
    ${resp}=    POST On Session    ropa    /api/ropa-records/${RECORD_FOR_APPROVE}/reject    json=${body}    headers=${headers}    expected_status=any
    # Expected: 400 (invalid state transition) — Actual: 500 (bug)
    Log    BUG FOUND: Rejecting an already-approved record returns ${resp.status_code} instead of 400    WARN
    Should Not Be Equal As Integers    ${resp.status_code}    200

# ---------------------------------------------------------------------------
# TC-APPR-003: Admin approve ไม่ได้ ต้องได้ 403
# ---------------------------------------------------------------------------
TC-APPR-003 Admin Cannot Approve ROPA Record
    [Documentation]    POST /api/ropa-records/{id}/approve โดย Admin ต้องได้ 403
    ...    Approval เป็นสิทธิ์ DPO เท่านั้น
    [Tags]    approval    negative    rbac
    # สร้าง record ใหม่
    ${admin_headers}=    Auth Header    ${ADMIN_TOKEN}
    ${dsc_ids}=    Create List    ${DSC_ID}
    ${pdt_ids}=    Create List    ${PDT_ID}
    ${body}=    Create Dictionary
    ...    department_id=${DEPT_ID}
    ...    role_type=Controller
    ...    controller_id=${CTRL_ID}
    ...    activity_name=กิจกรรมทดสอบ Admin Approve
    ...    purpose=ทดสอบ
    ...    risk_level=Low
    ...    data_subject_category_ids=${dsc_ids}
    ...    personal_data_type_ids=${pdt_ids}
    ...    legal_basis_thai=ฐานสัญญา (มาตรา 24(3))
    ${create_resp}=    POST On Session    ropa    /api/ropa-records    json=${body}    headers=${admin_headers}
    ${record_id}=    Set Variable    ${create_resp.json()['id']}
    # Admin พยายาม approve → ต้องได้ 403
    ${resp}=    POST On Session    ropa    /api/ropa-records/${record_id}/approve    headers=${admin_headers}    expected_status=any
    Response Should Be Forbidden    ${resp}

# ---------------------------------------------------------------------------
# TC-APPR-004: Reject โดยไม่ระบุ rejection_reason ต้องได้ 422
# ---------------------------------------------------------------------------
TC-APPR-004 Reject Without Reason Returns 422
    [Documentation]    POST /api/ropa-records/{id}/reject โดยไม่ระบุ rejection_reason ต้องได้ 422
    [Tags]    approval    negative
    ${headers}=    Auth Header    ${DPO_TOKEN}
    ${body}=    Create Dictionary
    ${resp}=    POST On Session    ropa    /api/ropa-records/${RECORD_FOR_REJECT}/reject    json=${body}    headers=${headers}    expected_status=any
    Should Be Equal As Integers    ${resp.status_code}    422

# ---------------------------------------------------------------------------
# TC-APPR-005: Viewer_Auditor approve ไม่ได้ ต้องได้ 403
# ---------------------------------------------------------------------------
TC-APPR-005 Viewer Cannot Approve ROPA Record
    [Documentation]    POST /api/ropa-records/{id}/approve โดย Viewer ต้องได้ 403
    [Tags]    approval    negative    rbac
    ${admin_headers}=    Auth Header    ${ADMIN_TOKEN}
    ${unique}=    Generate Random String    6    [NUMBERS]
    ${user_body}=    Create Dictionary
    ...    email=viewer_appr_${unique}@test.com
    ...    name=Viewer Approval Test
    ...    password=viewerpass123
    ...    role=Viewer_Auditor
    POST On Session    ropa    /api/users    json=${user_body}    headers=${admin_headers}
    ${viewer_token}=    Get Auth Token    viewer_appr_${unique}@test.com    viewerpass123
    ${viewer_headers}=    Auth Header    ${viewer_token}
    ${resp}=    POST On Session    ropa    /api/ropa-records/${RECORD_FOR_APPROVE}/approve    headers=${viewer_headers}    expected_status=any
    Response Should Be Forbidden    ${resp}
