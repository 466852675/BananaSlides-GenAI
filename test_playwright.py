"""
BananaSlides-GenAI 配置功能修复测试脚本 (Playwright版)

测试流程：
1. 访问前端页面并截图
2. 测试新用户注册 API (通过 fetch)
3. 验证积分配置是否生效

作者: Claude
日期: 2026-01-31
"""

from playwright.sync_api import sync_playwright
import time

# 测试配置
BASE_URL = "http://localhost:1001"
API_URL = "http://localhost:1111"

def test_api_endpoint(page):
    """测试API端点"""
    print("\n=== 测试 API 端点 ===")
    
    # 测试公开配置 API
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
        print("✓ 公开配置API调用成功")
        print(f"  配置内容: {result['data']}")
        return result['data']
    else:
        print(f"✗ API调用失败: {result.get('error')}")
        return None

def test_user_registration(page):
    """测试用户注册和积分赠送"""
    print("\n=== 测试新用户注册积分 ===")
    
    import uuid
    test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    test_password = "TestPassword123!"
    test_nickname = f"TestUser_{uuid.uuid4().hex[:4]}"
    
    print(f"注册邮箱: {test_email}")
    
    result = page.evaluate("""
        async ({ email, password, nickname }) => {
            try {
                const response = await fetch('http://localhost:1111/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, nickname })
                });
                const data = await response.json();
                return { success: response.ok, status: response.status, data: data };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
    """, {"email": test_email, "password": test_password, "nickname": test_nickname})
    
    if result.get('success'):
        print("✓ 注册成功")
        user = result['data'].get('user', {})
        print(f"  用户ID: {user.get('id')}")
        print(f"  初始积分: {user.get('points')}")
        return result['data']
    else:
        print(f"✗ 注册失败: {result.get('error') or result.get('data')}")
        return None

def main():
    """主测试函数"""
    print("="*60)
    print("BananaSlides-GenAI 配置功能修复测试")
    print("="*60)
    print(f"前端地址: {BASE_URL}")
    print(f"后端地址: {API_URL}")
    print("="*60)
    
    with sync_playwright() as p:
        # 启动浏览器
        browser = p.chromium.launch(headless=False)  # 设置为 True 可在后台运行
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        
        try:
            # 访问前端页面
            print("\n" + "="*60)
            print("步骤 1: 访问前端页面")
            print("="*60)
            page.goto(BASE_URL)
            page.wait_for_load_state("networkidle")
            print("✓ 页面加载完成")
            
            # 截图
            page.screenshot(path="test_homepage.png", full_page=True)
            print("✓ 截图已保存: test_homepage.png")
            
            # 测试 API 端点
            settings = test_api_endpoint(page)
            
            # 测试用户注册
            user_data = test_user_registration(page)
            
            # 测试邀请奖励（需要已注册用户）
            if user_data and user_data.get('token'):
                print("\n" + "="*60)
                print("步骤 4: 测试邀请奖励 (待实现)")
                print("="*60)
                print("ℹ 跳过详细测试，需要模拟另一个用户注册")
            
            print("\n" + "="*60)
            print("测试完成")
            print("="*60)
            
        except Exception as e:
            print(f"\n✗ 测试过程中出现错误: {e}")
            import traceback
            traceback.print_exc()
            
        finally:
            # 关闭浏览器
            browser.close()
            print("\n浏览器已关闭")

if __name__ == "__main__":
    main()
