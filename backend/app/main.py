from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables
from app.routers import auth, users, departments, audit_logs, user_logs, controllers, processors, master_data, ropa_records, dashboard, suggestions, import_router, export_router

app = FastAPI(
    title="ROPA Management Platform API",
    description="API สำหรับจัดการ Record of Processing Activities (ROPA) ตาม PDPA",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(departments.router, prefix="/api/departments", tags=["Departments"])
app.include_router(audit_logs.router, prefix="/api/audit-logs", tags=["Audit Logs"])
app.include_router(user_logs.router, prefix="/api/user-logs", tags=["User Logs"])
app.include_router(controllers.router, prefix="/api/controllers", tags=["Controllers"])
app.include_router(processors.router, prefix="/api/processors", tags=["Processors"])
app.include_router(master_data.router, prefix="/api/master-data", tags=["Master Data"])
app.include_router(ropa_records.router, prefix="/api/ropa-records", tags=["ROPA Records"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(suggestions.router, prefix="/api/suggestions", tags=["Suggestions"])
app.include_router(import_router.router, prefix="/api/import", tags=["Import"])
app.include_router(export_router.router, prefix="/api/export", tags=["Export"])


@app.on_event("startup")
def on_startup():
    create_tables()


@app.get("/")
def root():
    return {"message": "ROPA Management Platform API", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
