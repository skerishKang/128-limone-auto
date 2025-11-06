from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.get("/")
async def drive_root():
    return {"message": "Drive API - Coming Soon"}

@router.get("/files")
async def get_files():
    # TODO: Google Drive API 연동
    raise HTTPException(status_code=501, detail="Drive integration not implemented yet")

@router.post("/upload")
async def upload_file():
    # TODO: Google Drive 파일 업로드
    raise HTTPException(status_code=501, detail="Drive integration not implemented yet")
