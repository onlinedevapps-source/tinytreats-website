import zipfile
import os

def zipdir(path, ziph):
    # Valid folders/files to include
    includes = ['frontend', 'backend', 'README.md', '.gitignore']
    
    # Folders to explicitly exclude
    excludes = ['node_modules', 'venv', '__pycache__', 'dist', '.git', '.vscode']
    
    for root, dirs, files in os.walk(path):
        # Modify dirs in-place to skip excluded directories
        dirs[:] = [d for d in dirs if d not in excludes]
        
        for file in files:
            # Skip specific files
            if file.endswith('.zip') or file.endswith('.log'):
                continue
                
            file_path = os.path.join(root, file)
            # Create a relative path for the zip archive
            arcname = os.path.relpath(file_path, path)
            
            # Add to zip
            print(f"Adding {arcname}")
            ziph.write(file_path, arcname)

if __name__ == '__main__':
    zip_filename = 'tinytreats_project.zip'
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        zipdir('.', zipf)
    print(f"Successfully created {zip_filename}")
