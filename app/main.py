from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from routers import auth, model, upload

app = FastAPI()

# ? https://fastapi.tiangolo.com/tutorial/bigger-applications/#path-operations-with-apirouter
app.include_router(upload.router, prefix="/upload", tags=["upload"])
app.include_router(model.router, prefix="/model", tags=["model"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return RedirectResponse(url="/docs")
