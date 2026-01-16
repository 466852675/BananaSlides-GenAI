import sys

def diagnose(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    p = 0 # ()
    b = 0 # {}
    s = 0 # []
    
    app_started = False
    start_b = 0
    app_ended_line = -1
    
    for i, line in enumerate(lines):
        line_num = i + 1
        
        # Simple check for App start
        if "const App: React.FC = () => {" in line:
            app_started = True
            # We want to know the level BEFORE the opening brace of App
            # So we look at b BEFORE processing this line's braces?
            # Actually let's just use the level after this line.
            print(f"DEBUG: App start detected on line {line_num}")
        
        for char in line:
            if char == '(': p += 1
            elif char == ')': p -= 1
            elif char == '{': b += 1
            elif char == '}': b -= 1
            elif char == '[': s += 1
            elif char == ']': s -= 1
            
            if p < 0: print(f"ERROR: Underflow ( at line {line_num}, char {char}"); p = 0
            if b < 0: print(f"ERROR: Underflow {{ at line {line_num}, char {char}"); b = 0
            if s < 0: print(f"ERROR: Underflow [ at line {line_num}, char {char}"); s = 0
            
            if app_started and app_ended_line == -1 and b == 0:
                 # If b hit 0, it means the top-level block closed
                 print(f"DEBUG: Brace level hit 0 at line {line_num}. App component likely ended here.")
                 app_ended_line = line_num
        
        if app_started and line_num == 2446:
            print(f"DEBUG: Reached line 2446 (return start). Current brace level: {b}")

    print(f"Final totals -> P: {p}, B: {b}, S: {s}")

if __name__ == "__main__":
    diagnose('src/App.tsx')
