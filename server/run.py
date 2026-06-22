import uvicorn

from .config import config

if __name__ == "__main__":
    server = config["server"]
    uvicorn.run(
        "server.main:app",
        host=server["host"],
        port=server["port"],
        reload=True,
    )
