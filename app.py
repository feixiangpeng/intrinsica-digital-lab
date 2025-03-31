"""
INTRINSICA Digital Lab (IDL) - Main Application
AI-powered data analytics platform with conversational interface
"""
from flask import Flask, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename
import pandas as pd
import os
import json
import logging
import openai
from io import StringIO

app = Flask(__name__)

# Configure basic settings
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB file size limit
ALLOWED_EXTENSIONS = {'csv', 'txt', 'pdf'}

# Configure OpenAI (for development - use environment variable in production)
openai_api_key = os.environ.get('OPENAI_API_KEY', '')
if openai_api_key:
    openai.api_key = openai_api_key

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Helper function to check allowed files
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Data storage (in-memory for demonstration)
# In a real implementation, this would use a database
raw_data_store = {}
structured_data_store = {}
manipulated_data_store = {}

# Basic routes
@app.route('/')
def index():
    """API root endpoint with basic info"""
    return jsonify({
        'name': 'INTRINSICA Digital Lab API',
        'version': '0.1.0',
        'status': 'running'
    })

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'version': '0.1.0',
        'ai_available': bool(openai_api_key)
    })

# Data Ingestion API
@app.route('/api/data/upload', methods=['POST'])
def upload_file():
    """Upload data file endpoint - handles CSV files for data ingestion"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Process based on file type
        file_type = filename.rsplit('.', 1)[1].lower()
        
        try:
            if file_type == 'csv':
                # Store raw data
                with open(filepath, 'r') as f:
                    raw_content = f.read()
                raw_data_store[filename] = raw_content
                
                # Process into structured data
                df = pd.read_csv(filepath)
                # Simple normalization: fill NaN with empty strings, strip whitespace from string columns
                for col in df.select_dtypes(include=['object']).columns:
                    df[col] = df[col].fillna('').astype(str).str.strip()
                
                # Store structured data
                structured_data_store[filename] = df
                
                return jsonify({
                    'message': 'File uploaded and processed successfully',
                    'filename': filename,
                    'file_type': file_type,
                    'columns': list(df.columns),
                    'row_count': len(df)
                })
            else:
                return jsonify({
                    'message': 'File uploaded successfully, but processing not yet implemented for this type',
                    'filename': filename,
                    'file_type': file_type
                })
        except Exception as e:
            logger.error(f"Error processing file {filename}: {str(e)}")
            return jsonify({'error': f'Error processing file: {str(e)}'}), 500
    
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/api/data/list', methods=['GET'])
def list_datasets():
    """List available datasets"""
    return jsonify({
        'raw_datasets': list(raw_data_store.keys()),
        'structured_datasets': list(structured_data_store.keys()),
        'manipulated_datasets': list(manipulated_data_store.keys())
    })

@app.route('/api/data/view/<dataset_name>', methods=['GET'])
def view_dataset(dataset_name):
    """View dataset preview"""
    if dataset_name in structured_data_store:
        df = structured_data_store[dataset_name]
        return jsonify({
            'name': dataset_name,
            'columns': list(df.columns),
            'preview': df.head(5).to_dict(orient='records'),
            'row_count': len(df)
        })
    else:
        return jsonify({'error': 'Dataset not found'}), 404

# Conversational AI Query Interface
@app.route('/api/chat', methods=['POST'])
def chat_with_data():
    """Natural language query endpoint"""
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
        
    # Required parameters
    query = data.get('query')
    dataset_name = data.get('dataset')
    
    if not query:
        return jsonify({'error': 'No query provided'}), 400
    if not dataset_name:
        return jsonify({'error': 'No dataset specified'}), 400
        
    # Check if dataset exists
    if dataset_name not in structured_data_store:
        return jsonify({'error': f'Dataset {dataset_name} not found'}), 404
    
    df = structured_data_store[dataset_name]
    
    try:
        # Use OpenAI to interpret the query and generate code
        if openai_api_key:
            messages = [
                {"role": "system", "content": "You are a data analysis assistant. Convert natural language queries into Python pandas code. Only respond with executable code, no explanations."},
                {"role": "user", "content": f"Dataset columns: {', '.join(df.columns)}\n\nQuery: {query}\n\nGenerate Python pandas code to answer this query using a DataFrame named 'df':"}
            ]
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=messages
            )
            
            generated_code = response.choices[0].message['content'].strip()
            
            # Extract code if it's in a code block
            if "```python" in generated_code:
                generated_code = generated_code.split("```python")[1].split("```")[0].strip()
            elif "```" in generated_code:
                generated_code = generated_code.split("```")[1].split("```")[0].strip()
            
            # Execute the generated code (with safety measures in a real implementation)
            local_vars = {'df': df, 'pd': pd}
            exec(generated_code, {}, local_vars)
            
            # Look for result in local variables
            result_df_names = [var for var in local_vars if var != 'df' and isinstance(local_vars[var], pd.DataFrame)]
            if result_df_names:
                result_df = local_vars[result_df_names[0]]
            else:
                # Assume the last dataframe operation modified df
                result_df = local_vars['df']
            
            # Store in manipulated data
            result_key = f"{dataset_name}_result"
            manipulated_data_store[result_key] = result_df
            
            # Format response
            response_data = {
                'query': query,
                'dataset': dataset_name,
                'code': generated_code,
                'result': result_df.head(50).to_dict(orient='records'),
                'result_columns': list(result_df.columns),
                'result_row_count': len(result_df)
            }
            
            # Generate natural language explanation of results
            explanation_messages = [
                {"role": "system", "content": "You are a data analysis assistant. Explain data analysis results in simple terms."},
                {"role": "user", "content": f"Query: {query}\n\nDataset: {dataset_name}\n\nAnalysis code: {generated_code}\n\nResults: {result_df.head(5).to_markdown()}\n\nPlease provide a brief explanation of these results:"}
            ]
            
            explanation_response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=explanation_messages
            )
            
            response_data['explanation'] = explanation_response.choices[0].message['content'].strip()
            
            return jsonify(response_data)
        else:
            # Simplified response if OpenAI API key is not available
            return jsonify({
                'query': query,
                'dataset': dataset_name,
                'message': 'OpenAI API key not configured. This is a demo response.',
                'columns': list(df.columns),
                'preview': df.head(5).to_dict(orient='records')
            })
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}")
        return jsonify({'error': f'Error processing query: {str(e)}'}), 500

# Visualization endpoint
@app.route('/api/visualize', methods=['POST'])
def visualize_data():
    """Generate visualization configuration based on data"""
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    dataset_name = data.get('dataset')
    viz_type = data.get('type', 'bar')
    x_column = data.get('x_column')
    y_column = data.get('y_column')
    
    if not dataset_name or not x_column or not y_column:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    # Check if dataset exists in any store
    df = None
    if dataset_name in structured_data_store:
        df = structured_data_store[dataset_name]
    elif dataset_name in manipulated_data_store:
        df = manipulated_data_store[dataset_name]
    
    if df is None:
        return jsonify({'error': f'Dataset {dataset_name} not found'}), 404
    
    # Validate columns
    if x_column not in df.columns or y_column not in df.columns:
        return jsonify({'error': 'Specified columns not found in dataset'}), 400
    
    try:
        # Generate chart configuration
        # This is just configuration - the actual rendering would happen on the client side
        chart_config = {
            'type': viz_type,
            'data': {
                'labels': df[x_column].tolist()[:50],  # Limit to 50 data points
                'datasets': [{
                    'label': y_column,
                    'data': df[y_column].tolist()[:50],
                    'backgroundColor': 'rgba(54, 162, 235, 0.5)',
                    'borderColor': 'rgba(54, 162, 235, 1)',
                    'borderWidth': 1
                }]
            },
            'options': {
                'responsive': True,
                'title': {
                    'display': True,
                    'text': f'{y_column} by {x_column}'
                }
            }
        }
        
        return jsonify({
            'chart_config': chart_config,
            'message': 'Visualization configuration generated successfully'
        })
    except Exception as e:
        logger.error(f"Error generating visualization: {str(e)}")
        return jsonify({'error': f'Error generating visualization: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)