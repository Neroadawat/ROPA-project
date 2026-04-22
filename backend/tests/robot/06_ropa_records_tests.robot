*** Settings ***
Resource          resources/keywords.robot
Suite Setup       Run Keywords    Create API Session    AND    Setup Suite Variables

*** Variables ***
${ADMIN_TOKEN}          ${EMPTY}
${DEPT_ID}              ${EMPTY}
${CTRL_ID}              ${EMPTY}
${DSC_ID}               ${EMPTY}
${PDT_ID}               ${EMPTY}
${CREATED_RECORD_ID}    ${EMPTY}

*** Keywords ***
Setup Suite Variables
    # Admin token
    ${token}=    Get Auth Token    ${ADMIN_EMAIL}    ${ADMIN_PASSWORD}
    Set Suite Variable    ${ADMIN_TOKEN}    ${token}
    ${headers}=    Auth Header    ${token}
    # ดึง department แรกที่มีอยู่
    ${dept_resp}=    GET On Session    ropa    /api/departments    headers=${headers}
    ${dept_id}=    Set Variable    ${dept_resp.json()['items'][0]['id']}
    Set Suite Variable    ${DEPT_ID}    ${dept_id}
    # ดึง controller แรกที่มีอยู่ หรือสร้างใหม่
    ${ctrl_resp}=    GET On Session    ropa    /api/controllers    headers=${headers}
    ${ctrl_count}=    Get Length    ${ctrl_resp.json()['items']}
    IF    ${ctrl_count} > 0
        Set Suite Variable    ${CTRL_ID}    ${ctrl_resp.json()['items'][0]['id']}
    ELSE
        ${body}=    Create Dictionary    name=Controller สำหรับ ROPA Test
        ${create_resp}=    POST On Session    ropa    /api/controllers    json=${body}    headers=${headers}
        Set Suite Variable    ${CTRL_ID}    ${create_resp.json()['id']}
    END
    # ดึง data subject category แรก หรือสร้างใหม่
    ${dsc_resp}=    GET On Session    ropa    /api/master-data/data-subject-categories    headers=${headers}
    ${dsc_count}=    Get Length    ${dsc_resp.json()['items']}
    IF    ${dsc_count} > 0
        Set Suite Variable    ${DSC_ID}    ${dsc_resp.json()['items'][0]['id']}
    ELSE
        ${body}=    Create Dictionary    name=กลุ่มทดสอบ ROPA
        ${create_resp}=    POST On Session    ropa    /api/master-data/data-subject-categories    json=${body}    headers=${headers}
        Set Suite Variable    ${DSC_ID}    ${create_resp.json()['id']}
    END
    # ดึง personal data type แรก หรือสร้างใหม่
    ${pdt_resp}=    GET On Session    ropa    /api/master-data/personal-data-types    headers=${headers}
    ${pdt_count}=    Get Length    ${pdt_resp.json()['items']}
    IF    ${pdt_count} > 0
        Set Suite Variable    ${PDT_ID}    ${pdt_resp.json()['items'][0]['id']}
    ELSE
        ${body}=    Create Dictionary    name=ข้อมูลทดสอบ ROPA    sensitivity_level=general
        ${create_resp}=    POST On Session    ropa    /api/master-data/personal-data-types    json=${body}    headers=${headers}
        Set Suite Variable    ${PDT_ID}    ${create_resp.json()['id']}
    END

Build ROPA Body
    [Arguments]    ${activity_name}=กิจกรรมทดสอบ
    ${dsc_ids}=    Create List    ${DSC_ID}
    ${pdt_ids}=    Create List    ${PDT_ID}
    ${body}=    Create Dictionary
    ...    department_id=${DEPT_ID}
    ...    role_type=Controller
    ...    controller_id=${CTRL_ID}
    ...    activity_name=${activity_name}
    ...    purpose=เพื่อทดสอบระบบ
    ...    risk_level=Low
    ...    data_subject_category_ids=${dsc_ids}
    ...    personal_data_type_ids=${pdt_ids}
    ...    legal_basis_thai=ฐานสัญญา (มาตรา 24(3))
    ...    retention_period=1 ปี
    ...    storage_type=Electronic
    ...    data_owner=ฝ่ายทดสอบ
    RETURN    ${body}

*** Test Cases ***

# ---------------------------------------------------------------------------
# TC-ROPA-001: Admin ดูรายการ ROPA Records ได้
# ---------------------------------------------------------------------------
TC-ROPA-001 Admin Can List ROPA Records
    [Documentation]    GET /api/ropa-records ต้องได้รายการ records พร้อม pagination
    [Tags]    ropa    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/ropa-records    headers=${headers}
    Response Should Be OK    ${resp}
    Dictionary Should Contain Key    ${resp.json()}    items
    Dictionary Should Contain Key    ${resp.json()}    total
    Dictionary Should Contain Key    ${resp.json()}    page
    Dictionary Should Contain Key    ${resp.json()}    pages

# ---------------------------------------------------------------------------
# TC-ROPA-002: Admin สร้าง ROPA Record ใหม่ได้ (status = pending_approval)
# ---------------------------------------------------------------------------
TC-ROPA-002 Admin Can Create ROPA Record
    [Documentation]    POST /api/ropa-records ต้องสร้างสำเร็จ status = pending_approval
    [Tags]    ropa    positive    admin
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${body}=    Build ROPA Body    กิจกรรมทดสอบการสร้าง
    ${resp}=    POST On Session    ropa    /api/ropa-records    json=${body}    headers=${headers}
    Response Should Be Created    ${resp}
    Should Be Equal As Strings    ${resp.json()['status']}    pending_approval
    Should Be Equal As Strings    ${resp.json()['activity_name']}    กิจกรรมทดสอบการสร้าง
    Dictionary Should Contain Key    ${resp.json()}    department
    Dictionary Should Contain Key    ${resp.json()}    creator
    Set Suite Variable    ${CREATED_RECORD_ID}    ${resp.json()['id']}

# ---------------------------------------------------------------------------
# TC-ROPA-003: ดูรายละเอียด ROPA Record ได้
# ---------------------------------------------------------------------------
TC-ROPA-003 Get ROPA Record Detail
    [Documentation]    GET /api/ropa-records/{id} ต้องได้ full detail
    [Tags]    ropa    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/ropa-records/${CREATED_RECORD_ID}    headers=${headers}
    Response Should Be OK    ${resp}
    Should Be Equal As Integers    ${resp.json()['id']}    ${CREATED_RECORD_ID}
    Dictionary Should Contain Key    ${resp.json()}    data_subjects
    Dictionary Should Contain Key    ${resp.json()}    personal_data_types
    Dictionary Should Contain Key    ${resp.json()}    is_deleted

# ---------------------------------------------------------------------------
# TC-ROPA-004: ดู ROPA Record ที่ไม่มีอยู่ ต้องได้ 404
# ---------------------------------------------------------------------------
TC-ROPA-004 Get Non-Existent ROPA Record
    [Documentation]    GET /api/ropa-records/99999 ต้องได้ 404
    [Tags]    ropa    negative
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/ropa-records/99999    headers=${headers}    expected_status=any
    Response Should Be Not Found    ${resp}

# ---------------------------------------------------------------------------
# TC-ROPA-005: Filter ROPA Records ตาม status
# ---------------------------------------------------------------------------
TC-ROPA-005 Filter ROPA Records By Status
    [Documentation]    GET /api/ropa-records?status=pending_approval ต้องกรองได้
    [Tags]    ropa    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${params}=    Create Dictionary    status=pending_approval
    ${resp}=    GET On Session    ropa    /api/ropa-records    headers=${headers}    params=${params}
    Response Should Be OK    ${resp}
    # ทุก item ต้องมี status = pending_approval
    FOR    ${item}    IN    @{resp.json()['items']}
        Should Be Equal As Strings    ${item['status']}    pending_approval
    END

# ---------------------------------------------------------------------------
# TC-ROPA-006: Search ROPA Records ด้วยคำค้น
# ---------------------------------------------------------------------------
TC-ROPA-006 Search ROPA Records
    [Documentation]    GET /api/ropa-records?search=ทดสอบ ต้องค้นหาได้
    [Tags]    ropa    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${params}=    Create Dictionary    search=ทดสอบ
    ${resp}=    GET On Session    ropa    /api/ropa-records    headers=${headers}    params=${params}
    Response Should Be OK    ${resp}
    Dictionary Should Contain Key    ${resp.json()}    items

# ---------------------------------------------------------------------------
# TC-ROPA-007: Admin แก้ไข ROPA Record ได้ (ต้องระบุ reason)
# ---------------------------------------------------------------------------
TC-ROPA-007 Admin Can Update ROPA Record
    [Documentation]    PUT /api/ropa-records/{id} ต้องอัปเดตสำเร็จ status = pending_edit_approval
    [Tags]    ropa    positive    admin
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary
    ...    activity_name=กิจกรรมทดสอบ (แก้ไขแล้ว)
    ...    purpose=เพื่อทดสอบการแก้ไข
    ...    reason=แก้ไขเพื่อทดสอบระบบ
    ${resp}=    PUT On Session    ropa    /api/ropa-records/${CREATED_RECORD_ID}    json=${body}    headers=${headers}
    Response Should Be OK    ${resp}
    Should Be Equal As Strings    ${resp.json()['activity_name']}    กิจกรรมทดสอบ (แก้ไขแล้ว)

# ---------------------------------------------------------------------------
# TC-ROPA-008: แก้ไข ROPA Record โดยไม่ระบุ reason ต้องได้ 422
# ---------------------------------------------------------------------------
TC-ROPA-008 Update ROPA Record Without Reason
    [Documentation]    PUT /api/ropa-records/{id} โดยไม่ระบุ reason ต้องได้ 422
    [Tags]    ropa    negative
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary    activity_name=ไม่มี reason
    ${resp}=    PUT On Session    ropa    /api/ropa-records/${CREATED_RECORD_ID}    json=${body}    headers=${headers}    expected_status=any
    Should Be Equal As Integers    ${resp.status_code}    422

# ---------------------------------------------------------------------------
# TC-ROPA-009: Viewer_Auditor สร้าง ROPA Record ไม่ได้ ต้องได้ 403
# ---------------------------------------------------------------------------
TC-ROPA-009 Viewer Cannot Create ROPA Record
    [Documentation]    POST /api/ropa-records โดย Viewer_Auditor ต้องได้ 403
    [Tags]    ropa    negative    rbac
    # สร้าง viewer user
    ${admin_headers}=    Auth Header    ${ADMIN_TOKEN}
    ${unique}=    Generate Random String    6    [NUMBERS]
    ${user_body}=    Create Dictionary
    ...    email=viewer_ropa_${unique}@test.com
    ...    name=Viewer ROPA Test
    ...    password=viewerpass123
    ...    role=Viewer_Auditor
    POST On Session    ropa    /api/users    json=${user_body}    headers=${admin_headers}
    ${viewer_token}=    Get Auth Token    viewer_ropa_${unique}@test.com    viewerpass123
    ${viewer_headers}=    Auth Header    ${viewer_token}
    ${body}=    Build ROPA Body    กิจกรรมจาก Viewer
    ${resp}=    POST On Session    ropa    /api/ropa-records    json=${body}    headers=${viewer_headers}    expected_status=any
    Response Should Be Forbidden    ${resp}

# ---------------------------------------------------------------------------
# TC-ROPA-010: ดู Retention Alerts
# ---------------------------------------------------------------------------
TC-ROPA-010 Get Retention Alerts
    [Documentation]    GET /api/ropa-records/retention-alerts ต้องได้ response ถูกต้อง
    [Tags]    ropa    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/ropa-records/retention-alerts    headers=${headers}
    Response Should Be OK    ${resp}
    # response มี structure: { "alerts": { overdue, within_30, within_60_90, review_overdue }, "summary": {...} }
    Dictionary Should Contain Key    ${resp.json()}    alerts
    Dictionary Should Contain Key    ${resp.json()}    summary
    Dictionary Should Contain Key    ${resp.json()['alerts']}    overdue
    Dictionary Should Contain Key    ${resp.json()['alerts']}    within_30
    Dictionary Should Contain Key    ${resp.json()['alerts']}    within_60_90
    Dictionary Should Contain Key    ${resp.json()['alerts']}    review_overdue

# ---------------------------------------------------------------------------
# TC-ROPA-011: ดู Version History ของ ROPA Record
# ---------------------------------------------------------------------------
TC-ROPA-011 Get ROPA Record Versions
    [Documentation]    GET /api/ropa-records/{id}/versions ต้องได้รายการ versions
    [Tags]    ropa    positive
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${resp}=    GET On Session    ropa    /api/ropa-records/${CREATED_RECORD_ID}/versions    headers=${headers}
    Response Should Be OK    ${resp}
    Dictionary Should Contain Key    ${resp.json()}    items
    Dictionary Should Contain Key    ${resp.json()}    total

# ---------------------------------------------------------------------------
# TC-ROPA-012: Admin ร้องขอลบ ROPA Record ได้ (ต้องระบุ reason)
# ---------------------------------------------------------------------------
TC-ROPA-012 Admin Can Request Delete ROPA Record
    [Documentation]    DELETE /api/ropa-records/{id} record ที่ status=approved ต้องเปลี่ยน status = pending_delete_approval
    [Tags]    ropa    positive    admin
    # สร้าง record ใหม่และ approve ก่อน (ต้องเป็น approved จึงจะ request delete ได้)
    ${headers}=    Auth Header    ${ADMIN_TOKEN}
    ${body}=    Build ROPA Body    กิจกรรมสำหรับทดสอบการลบ
    ${create_resp}=    POST On Session    ropa    /api/ropa-records    json=${body}    headers=${headers}
    ${record_id}=    Set Variable    ${create_resp.json()['id']}
    # Approve ด้วย DPO token ก่อน
    ${admin_headers}=    Auth Header    ${ADMIN_TOKEN}
    ${unique}=    Generate Random String    6    [NUMBERS]
    ${dpo_body}=    Create Dictionary
    ...    email=dpo_del_${unique}@test.com
    ...    name=DPO Delete Test
    ...    password=dpopass123
    ...    role=DPO
    POST On Session    ropa    /api/users    json=${dpo_body}    headers=${admin_headers}
    ${dpo_token}=    Get Auth Token    dpo_del_${unique}@test.com    dpopass123
    ${dpo_headers}=    Auth Header    ${dpo_token}
    POST On Session    ropa    /api/ropa-records/${record_id}/approve    headers=${dpo_headers}
    # ร้องขอลบ
    ${del_body}=    Create Dictionary    reason=ทดสอบการลบ record
    ${resp}=    DELETE On Session    ropa    /api/ropa-records/${record_id}    json=${del_body}    headers=${headers}
    Response Should Be OK    ${resp}
    Should Be Equal As Strings    ${resp.json()['status']}    pending_delete_approval

# ---------------------------------------------------------------------------
# TC-ROPA-013: ดู Pending Queue (DPO only)
# ---------------------------------------------------------------------------
TC-ROPA-013 Get Pending Queue
    [Documentation]    GET /api/ropa-records/pending ต้องได้รายการ records ที่รอ approve (DPO only)
    [Tags]    ropa    positive    dpo
    # สร้าง DPO user
    ${admin_headers}=    Auth Header    ${ADMIN_TOKEN}
    ${unique}=    Generate Random String    6    [NUMBERS]
    ${dpo_body}=    Create Dictionary
    ...    email=dpo_pending_${unique}@test.com
    ...    name=DPO Pending Test
    ...    password=dpopass123
    ...    role=DPO
    POST On Session    ropa    /api/users    json=${dpo_body}    headers=${admin_headers}
    ${dpo_token}=    Get Auth Token    dpo_pending_${unique}@test.com    dpopass123
    ${dpo_headers}=    Auth Header    ${dpo_token}
    # DPO ดู pending queue
    ${resp}=    GET On Session    ropa    /api/ropa-records/pending    headers=${dpo_headers}
    Response Should Be OK    ${resp}
    Dictionary Should Contain Key    ${resp.json()}    items

# ---------------------------------------------------------------------------
# TC-ROPA-014: ดู ROPA Records โดยไม่มี token ต้องได้ 401
# ---------------------------------------------------------------------------
TC-ROPA-014 List ROPA Records Without Token
    [Documentation]    GET /api/ropa-records โดยไม่มี token ต้องได้ 401
    [Tags]    ropa    negative
    ${resp}=    GET On Session    ropa    /api/ropa-records    expected_status=any
    Response Should Be Unauthorized    ${resp}
