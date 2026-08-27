from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from app.api import routes

app = FastAPI(title="PaperGraph Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],)

# include routes
app.include_router(routes.router)
