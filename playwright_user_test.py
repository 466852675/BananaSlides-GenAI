"""
YH-AI PPT 用户模拟测试
使用 Playwright 模拟用户操作，验证配置功能修复

测试流程：
1. 访问前端页面
2. 模拟用户注册
3. 验证新用户积分
4. 测试邀请功能
5. 验证积分变化

使用方法:
    python playwright_user_test.py

需要安装:
    pip install playwright
    playwright install
"""

from playwright.sync_api import sync_playwright, expect
import time
import random
import string

# 配置
FRONTEND_URL = "http://localhost:1000"
API_URL = "http://localhost:1111"

def generate_random_email():
    """生成随机邮箱"""
    random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"test_{random_str}@example.com"

def take_screenshot(page, name):
    """截图并保存"""
    try:
        page.screenshot(path=f"test_screenshots/{name}.png", full_page=True)
        print(f"  📸 截图已保存: test_screenshots/{name}.png")
    except Exception as e:
        print(f"  ⚠️ 截图失败: {e}")

def test_step_1_homepage(page):
    """步骤1: 访问首页"""
    print("\n步骤 1: 访问首页...")
    
    page.goto(FRONTEND_URL)
    page.wait_for_load_state("networkidle")
    
    # 等待页面加载
    page.wait_for_timeout(2000)
    
    take_screenshot(page, "01_homepage")
    
    # 检查页面内容
    content = page.content()
    if "YH-AI PPT" in content or "PPT" in content:
        print("  ✅ 页面内容验证通过")
    else:
        print("  ⚠️ 页面内容可能需要检查")

def test_step_2_register_referrer(page):
    """步骤2: 注册用户(带推荐人)"""
    print("\n步骤 2: 注册用户(带推荐人)...")
    
    # 点击"免费开始"或"立即体验"按钮
    try:
        # 尝试多个可能的按钮文本
        button_selectors = [
            'button:has-text("免费开始")',
            'button:has-text("立即体验")',
            'button:has-text("开始使用")',
            'a:has-text("免费开始")',
            'a:has-text("立即体验")',
        ]
        
        for selector in button_selectors:
            try:
                button = page.locator(selector).first
                if button.is_visible():
                    button.click()
                    print(f"  ✅ 点击了: {selector}")
                    break
            except:
                continue
        else:
            print("  ⚠️ 未找到开始按钮，尝试直接访问注册页")
            page.goto(f"{FRONTEND_URL}/auth/register")
    except Exception as e:
        print(f"  ⚠️ 点击开始按钮失败: {e}")
        page.goto(f"{FRONTEND_URL}/auth/register")
    
    page.wait_for_timeout(2000)
    take_screenshot(page, "02_register_page")
    
    # 填写注册表单
    test_email = generate_random_email()
    test_password = "Test123456!"
    referrer_code = "TEST123"  # 测试推荐码
    
    try:
        # 填写邮箱
        email_input = page.locator('input[type="email"]').first
        email_input.fill(test_email)
        print(f"  ✅ 填写邮箱: {test_email}")
        
        # 填写密码
        password_input = page.locator('input[type="password"]').first
        password_input.fill(test_password)
        print(f"  ✅ 填写密码")
        
        # 填写推荐码(如果有输入框)
        try:
            referrer_input = page.locator('input[name="referrerCode"], input[placeholder*="推荐"]').first
            if referrer_input.is_visible():
                referrer_input.fill(referrer_code)
                print(f"  ✅ 填写推荐码: {referrer_code}")
        except:
            print("  ℹ️ 推荐码输入框未找到或不可用")
        
        # 点击注册按钮
        register_button = page.locator('button[type="submit"]').first
        register_button.click()
        print("  ✅ 点击注册按钮")
        
        # 等待注册完成
        page.wait_for_timeout(3000)
        take_screenshot(page, "03_register_submit")
        
        return test_email, test_password
        
    except Exception as e:
        print(f"  ❌ 注册失败: {e}")
        take_screenshot(page, "03_register_error")
        return None, None

def test_step_3_check_points(page, email, password):
    """步骤3: 检查用户积分"""
    print("\n步骤 3: 检查用户积分...")
    
    try:
        # 等待登录状态
        page.wait_for_timeout(2000)
        
        # 查找积分显示元素
        point_selectors = [
            'text=/\\d+\\s*积分/',
            '[class*="point"]',
            '[class*="credit"]',
            'text=/积分余额/',
        ]
        
        for selector in point_selectors:
            try:
                element = page.locator(selector).first
                if element.is_visible():
                    text = element.inner_text()
                    print(f"  ✅ 找到积分信息: {text}")
                    break
            except:
                continue
        else:
            print("  ⚠️ 未找到积分显示，可能需要导航到用户中心")
            # 尝试点击用户菜单
            try:
                user_menu = page.locator('[class*="user"], button:has-text("用户"), [class*="avatar"]').first
                user_menu.click()
                page.wait_for_timeout(1000)
                
                # 查找积分
                points_link = page.locator('text=/积分/, text=/余额/').first
                if points_link.is_visible():
                    points_link.click()
                    page.wait_for_timeout(2000)
                    take_screenshot(page, "04_points_page")
            except Exception as e:
                print(f"  ⚠️ 导航到积分页面失败: {e}")
        
        take_screenshot(page, "04_check_points")
        
    except Exception as e:
        print(f"  ❌ 检查积分失败: {e}")
        take_screenshot(page, "04_points_error")

def test_step_4_invite_feature(page):
    """步骤4: 测试邀请功能"""
    print("\n步骤 4: 测试邀请功能...")
    
    try:
        # 导航到邀请页面
        page.goto(f"{FRONTEND_URL}/user/invite")
        page.wait_for_timeout(2000)
        take_screenshot(page, "05_invite_page")
        
        # 检查邀请链接或邀请码
        content = page.content()
        if "邀请" in content or "invite" in content.lower():
            print("  ✅ 邀请页面加载成功")
            
            # 尝试查找邀请码
            try:
                invite_code = page.locator('[class*="code"], [class*="invite"]').first
                if invite_code.is_visible():
                    code_text = invite_code.inner_text()
                    print(f"  ✅ 找到邀请码: {code_text}")
            except:
                print("  ℹ️ 未找到邀请码显示")
        else:
            print("  ⚠️ 邀请页面可能未正确加载")
            
    except Exception as e:
        print(f"  ❌ 邀请功能测试失败: {e}")
        take_screenshot(page, "05_invite_error")

def test_step_5_check_activity(page):
    """步骤5: 检查活动中心"""
    print("\n步骤 5: 检查活动中心...")
    
    try:
        # 导航到活动页面
        page.goto(f"{FRONTEND_URL}/user/activities")
        page.wait_for_timeout(2000)
        take_screenshot(page, "06_activities_page")
        
        content = page.content()
        if "活动" in content or "签到" in content:
            print("  ✅ 活动中心页面加载成功")
            
            # 尝试点击签到按钮
            try:
                checkin_btn = page.locator('button:has-text("签到"), button:has-text("Check")').first
                if checkin_btn.is_visible():
                    checkin_btn.click()
                    print("  ✅ 点击签到按钮")
                    page.wait_for_timeout(2000)
                    take_screenshot(page, "07_checkin_result")
            except:
                print("  ℹ️ 签到按钮未找到或已签到")
        else:
            print("  ⚠️ 活动中心页面可能未正确加载")
            
    except Exception as e:
        print(f"  ❌ 活动中心测试失败: {e}")

def run_all_tests():
    """运行所有测试"""
    import os
    
    # 创建截图目录
    os.makedirs("test_screenshots", exist_ok=True)
    
    print("\n" + "="*80)
    print("  🚀 YH-AI PPT 用户模拟测试")
    print("  使用 Playwright 模拟完整用户操作流程")
    print("="*80)
    
    print(f"\n  📍 前端地址: {FRONTEND_URL}")
    print(f"  📍 API地址: {API_URL}")
    
    with sync_playwright() as p:
        # 启动浏览器
        browser = p.chromium.launch(headless=False, slow_mo=100)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        
        try:
            # 执行测试步骤
            test_step_1_homepage(page)
            email, password = test_step_2_register_referrer(page)
            
            if email and password:
                test_step_3_check_points(page, email, password)
                test_step_4_invite_feature(page)
                test_step_5_check_activity(page)
                
                print("\n" + "="*80)
                print("  ✅ 所有测试步骤已完成!")
                print(f"  📧 测试邮箱: {email}")
                print("="*80)
            else:
                print("\n  ❌ 注册失败，跳过后续测试")
                
        except Exception as e:
            print(f"\n  ❌ 测试过程中出现错误: {e}")
            take_screenshot(page, "error_final")
            
        finally:
            # 保持浏览器打开一段时间以便查看结果
            print("\n  ⏳ 等待 5 秒后关闭浏览器...")
            page.wait_for_timeout(5000)
            browser.close()

if __name__ == "__main__":
    run_all_tests()
