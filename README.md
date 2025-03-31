# INTRINSICA Digital Lab (IDL)

An AI-powered data analytics platform that enables users to interact with their data through a natural language interface.

## Overview

INTRINSICA Digital Lab is a conversational AI data analytics platform that allows users to upload data, ask questions in natural language, and get visualizations and insights without needing to write code. The platform handles the entire data lifecycle from ingestion to analysis and visualization.

## Features

- **Data Upload**: Upload and process CSV files
- **Natural Language Queries**: Ask questions about your data in plain English
- **AI-Powered Analysis**: Uses OpenAI to translate natural language into Python code
- **Data Visualization**: Generate charts and graphs from your data
- **Dataset Management**: View and manage multiple datasets

## Tech Stack

- **Backend**: Flask (Python)
- **Frontend**: HTML, CSS, JavaScript
- **AI**: OpenAI API integration
- **Visualization**: Chart.js
- **Deployment**: Render

## API Endpoints

### Basic Endpoints
- `GET /`: Frontend application
- `GET /api`: API info
- `GET /api/health`: Health check and status

### Data Management
- `POST /api/data/upload`: Upload CSV files
- `GET /api/data/list`: List all available datasets
- `GET /api/data/view/<dataset_name>`: Preview dataset

### Analysis
- `POST /api/chat`: Natural language query processing
- `POST /api/visualize`: Generate chart configurations

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/intrinsica-digital-lab.git
   cd intrinsica-digital-lab
   ```

2. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables
   ```bash
   # Create a .env file
   echo "OPENAI_API_KEY=your_api_key_here" > .env
   ```

4. Run the application
   ```bash
   gunicorn app:app
   ```

5. Access the application
   ```
   http://localhost:8000
   ```

## Usage

### Uploading Data
1. Navigate to the "Data Upload" section
2. Click "Choose File" and select a CSV file
3. Click "Upload" to process the file

### Querying Data
1. Navigate to the "Natural Language Query" section
2. Select your dataset from the dropdown
3. Type your query (e.g., "Show me the top 5 rows sorted by revenue")
4. View results, explanation, and generated code

### Visualizing Data
1. Navigate to the "Visualization" section
2. Select your dataset, X and Y columns, and chart type
3. Click "Generate Chart" to create your visualization

## Deployment

The application is deployed on Render. To deploy your own instance:

1. Push your code to a Git repository
2. Create a new Web Service on Render
3. Connect your repository
4. Set the build command: `pip install -r requirements.txt`
5. Set the start command: `gunicorn app:app`
6. Add the `OPENAI_API_KEY` environment variable
7. Deploy the service

<img width="1357" alt="Screenshot 2025-03-31 at 15 49 01" src="https://github.com/user-attachments/assets/09b12f90-8a21-4920-99e3-ee152eabc3e4" />

