import pytest
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

@pytest.fixture(scope="session")
def driver():
    # Tự động tải ChromeDriver tương thích với phiên bản Chrome trên máy bạn
    service = Service(ChromeDriverManager().install())
    options = webdriver.ChromeOptions()
    options.add_argument("--start-maximized")
    # options.add_argument("--headless") # Bỏ comment nếu muốn chạy ngầm

    driver = webdriver.Chrome(service=service, options=options)
    driver.implicitly_wait(10) # Chờ tối đa 10s nếu mạng chậm
    yield driver
    driver.quit()
