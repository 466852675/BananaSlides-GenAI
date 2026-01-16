def check_app_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    b = 0
    app_started = False
    
    for i, line in enumerate(lines):
        line_num = i + 1
        
        if "const App: React.FC = () => {" in line:
            app_started = True
            print(f"DEBUG: App component starts at line {line_num}. Level before: {b}")
        
        for char in line:
            if char == '{': b += 1
            elif char == '}': b -= 1
            
            if b == 0 and app_started:
                # Potential early end
                # Check if it's just a regular block ending or the component
                # Real component ends usually have a return before them or are at the end
                print(f"DEBUG: Brace level returned to 0 at line {line_num} (char '{char}').")
        
        if app_started and line_num == 400:
            print(f"DEBUG: Line 400 check. Current brace level: {b}")
        if app_started and line_num == 2446:
            print(f"DEBUG: Line 2446 check (return). Current brace level: {b}")

if __name__ == "__main__":
    check_app_braces('src/App.tsx')
