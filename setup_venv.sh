#!/usr/bin/env bash
set -e

echo "==================================================="
echo " VisionCraft Python Virtual Environment Setup"
echo "==================================================="

if [ ! -d ".venv" ]; then
    echo "Creating virtual environment in .venv..."
    python3 -m venv .venv
else
    echo "Virtual environment .venv already exists."
fi

echo "Activating virtual environment..."
source .venv/bin/activate

echo "Upgrading pip and installing requirements..."
pip install --upgrade pip
pip install -r requirements.txt
pip install -e .

echo "==================================================="
echo " VisionCraft setup complete!"
echo " To activate: source .venv/bin/activate"
echo " To start server: npm run server"
echo "==================================================="
