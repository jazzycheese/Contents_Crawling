from bs4 import BeautifulSoup as soup
import urllib2
import requests

page_url = "file:///Users/soyeon/Chosun_Crawling/pg2.html"
page = urllib2.urlopen(page_url)
page_soup = soup(page.read(), "html.parser")


data = []

#containers = page_soup.find_all("table", attrs={"width": "980"})

out_filename = "crawling.csv"
headers = "제목,연도월일날짜,면,기고자\n"
f = open(out_filename, "w")
f.write(headers)

#2번쨰table>tbody>1번쨰tr>4번쨰td>5번쨰table부터2n>

#제목
titles = soup.select('tbody'>tr)
print (titles)


#1:tbody>tr>2번쨰td>font>a>font>1번쨰font 내용
#1:tbody>tr>2번쨰td>font>a>font>1번쨰font>b 내용
#1:tbody>tr>2번쨰td>font>a>font 내용

#연도월일날짜, 면
2:tbody>1번쨰tr>2번째td>table>tbody>1번째tr>td>font>내용

#기고자
2:tbody>2번쨰tr>2번째td 내용

# loops over each product and grabs attributes about
# each product
for container in containers:
    # Finds all link tags "a" from within the first div.
    make_rating_sp = container.div.select("a")

    # Grabs the title from the image title attribute
    # Then does proper casing using .title()
    brand = make_rating_sp[0].img["title"].title()

    # Grabs the text within the second "(a)" tag from within
    # the list of queries.
    product_name = container.div.select("a")[2].text

    # Grabs the product shipping information by searching
    # all lists with the class "price-ship".
    # Then cleans the text of white space with strip()
    # Cleans the strip of "Shipping $" if it exists to just get number
    shipping = container.findAll("li", {"class": "price-ship"})[0].text.strip().replace("$", "").replace(" Shipping", "")

    # prints the dataset to console
    print("brand: " + brand + "\n")
    print("product_name: " + product_name + "\n")
    print("shipping: " + shipping + "\n")

    # writes the dataset to file
    f.write(brand + ", " + product_name.replace(",", "|") + ", " + shipping + "\n")

f.close()
"""