import logging
import sys
from pathlib import Path
from datetime import datetime

# 로그 디렉토리 생성
LOG_DIR = Path("../../logs")
LOG_DIR.mkdir(exist_ok=True)

# 로그 포맷 설정
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# 로거 설정
def setup_logger(name: str = "limone", level: int = logging.INFO):
    """로거 설정 및 반환"""
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # 핸들러가 이미 있으면 중복 추가 방지
    if not logger.handlers:
        # 콘솔 핸들러
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level)
        console_formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)
        
        # 파일 핸들러
        today = datetime.now().strftime("%Y-%m-%d")
        log_file = LOG_DIR / f"limone-{today}.log"
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setLevel(level)
        file_formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
    
    return logger

# 기본 로거
logger = setup_logger()
