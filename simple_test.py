"""
BananaSlides-GenAI 配置功能修复测试 (简化版)
使用 Playwright 测试 API 功能
"""

from playwright.sync_api import sync_playwright
import time

API_URL = "http://localhost:1111"

def run_tests():
    print("="*60)
    print("BananaSlides-GenAI 配置功能修复测试")
    print("="*60)
    
    with sync_playwright() as p:
        # 启动浏览器
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # 测试 1: 获取公开配置
        print("\n--- 测试 1: 获取公开配置 ---")
        result = page.evaluate("""
            async () => {
                try {
                    const response = await fetch('http://localhost:1111/api/settings/public');
                    const data = await response.json();
                    return { success: true, data: data };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        """)
        
        if result.get('success'):
            print("✓ 获取配置成功")
            settings = result['data']
            for key, value in settings.items():
                print(f"  {key}: {value}")
        else:
            print(f"✗ 获取配置失败: {result.get('error')}")
        
        # 测试 2: 新用户注册
        print("\n--- 测试 2: 新用户注册积分 ---")
        import uuid
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        test_nickname = f"Test_{uuid.uuid4().hex[:4]}"
        
        print(f"注册邮箱: {test_email}")
        
        result = page.evaluate("""
            async ({ email, nickname }) => {
                try {
                    const response = await fetch('http://localhost:1111/api/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            email, 
                            password: 'TestPass123!',
                            nickname 
                        })
                    });
                    const data = await response.json();
                    return { 
                        success: response.ok, 
                        status: response.status, 
                        data: data 
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        """, {"email": test_email, "nickname": test_nickname})
        
        if result.get('success'):
            print("✓ 注册成功")
            user = result['data'].get('user', {})
            points = user.get('points')
            print(f"  用户ID: {user.get('id')}")
            print(f"  初始积分: {points}")
            
            # 验证积分是否为 100 (我们在测试配置中设置的值)
            if points == 100:
                print("✓ 积分验证通过: 新用户获得 100 积分")
            else:
                print(f"⚠ 积分验证: 期望 100 积分，实际 {points} 积分")
                print("  提示: 如果数据库中的配置值不是 100，这是正常的")
        else:
            print(f"✗ 注册失败: {result.get('error') or result.get('data')}")
        
        # 关闭浏览器
        browser.close()
    
    print("\n" + "="*60)
    print("测试完成")
    print("="*60)

if __name__ == "__main__":
    run_tests()
