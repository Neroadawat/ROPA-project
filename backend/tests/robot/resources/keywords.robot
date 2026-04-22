*** Settings ***
Library    RequestsLibrary
Library    Collections
Library    String

*** Variables ***
${BASE_URL}         http://localhost:8000
${ADMIN_EMAIL}      admin@triangle.com
${ADMIN_PASSWORD}   admin123456
${DPO_EMAIL}        dpo@triangle.com
${DPO_PASSWORD}     dpo123456
${DEPT_EMAIL}       dept@triangle.com
${DEPT_PASSWORD}    dept123456

*** Keywords ***
Create API Session
    Create Session    ropa    ${BASE_URL}    verify=false

Get Auth Token
    [Arguments]    ${email}    ${password}
    ${body}=    Create Dictionary    email=${email}    password=${password}
    ${resp}=    POST On Session    ropa    /api/auth/login    json=${body}
    Should Be Equal As Integers    ${resp.status_code}    200
    ${token}=    Set Variable    ${resp.json()['access_token']}
    RETURN    ${token}

Auth Header
    [Arguments]    ${token}
    ${headers}=    Create Dictionary    Authorization=Bearer ${token}
    RETURN    ${headers}

Response Should Be OK
    [Arguments]    ${resp}
    Should Be Equal As Integers    ${resp.status_code}    200

Response Should Be Created
    [Arguments]    ${resp}
    Should Be Equal As Integers    ${resp.status_code}    201

Response Should Be Unauthorized
    [Arguments]    ${resp}
    # FastAPI HTTPBearer returns 403 when no Authorization header is provided,
    # and 401 when token is invalid/expired. Both indicate unauthenticated access.
    Should Be True    ${resp.status_code} in [401, 403]

Response Should Be Forbidden
    [Arguments]    ${resp}
    Should Be Equal As Integers    ${resp.status_code}    403

Response Should Be Not Found
    [Arguments]    ${resp}
    Should Be Equal As Integers    ${resp.status_code}    404

Response Should Have Key
    [Arguments]    ${resp}    ${key}
    Dictionary Should Contain Key    ${resp.json()}    ${key}
