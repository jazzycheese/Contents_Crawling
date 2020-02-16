
"""
#bigkinds analysis
from bs4 import BeautifulSoup as soup

f= open("k_pg1.html")
page_soup = soup(f.read(), "html.parser")

tables = page_soup.select('table')
table_length = len(tables)
i = 0
result = []

title = page_soup.find_all("h4", class_="news-item__title news-detail")    #title ("h4", class_="news-item__title news-detail") 
while i<100:
    print (title[i].get_text())
    i=i+1

f.close()
"""
"""
import urllib.request
from bs4 import BeautifulSoup

url = "http://biz.khan.co.kr/khan_art_view.html?artid=201909220923011&code=920100"
req = urllib.request.Request(url)
sourcecode = urllib.request.urlopen(url).read()
soup = BeautifulSoup(sourcecode, "html.parser")

content = soup.find("p", class_="content_text")
for list in content.find_all("p"):
    print(list.get_text())

"""

#경향신문 본문 찾기
#import requests
#response = requests.get('https://www.msn.com/ko-kr/news/techandscience/%EB%94%A5%ED%8E%98%EC%9D%B4%ED%81%AC%EC%9D%98-%EC%8B%9C%EB%8C%80-%EC%9D%B8%EA%B3%B5%EC%A7%80%EB%8A%A5-%EC%9D%B4%EC%9A%A9%ED%95%9C-%EC%82%AC%EA%B8%B0-%EC%96%B4%EB%96%BB%EA%B2%8C-%EB%A7%89%EB%82%98/ar-AAHE4mJ')
#html = response.text
#from bs4 import BeautifulSoup
#soup = BeautifulSoup(html, 'html.parser')
#for tag in soup.select("p", class_="content_text"):
#        print(tag.text)


#조선일보 본문찾기
import requests
response = requests.get('http://biz.chosun.com/site/data/html_dir/2012/03/13/2012031302976.html')
html = response.text
from bs4 import BeautifulSoup
soup = BeautifulSoup(html, 'html.parser')
for tag in soup.select('div[class=par]'):
    print(tag.text) 


        


