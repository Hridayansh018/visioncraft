@echo off
echo ===================================================
echo  VisionCraft Python Virtual Environment Setup
echo ===================================================

if not exist ".venv" (
    echo Creating virtual environment in .venv...
    python -m venv .venv
) else (
    echo Virtual environment .venv already exists.
)

echo Activating virtual environment...
call .venv\Scripts\activate.bat

echo Upgrading pip and installing requirements...
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install -e .

echo ===================================================
echo  VisionCraft setup complete!
echo  To activate: .venv\Scripts\activate
echo  To start server: npm run server
echo ===================================================
