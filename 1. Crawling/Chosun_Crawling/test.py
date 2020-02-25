
"""
from bs4 import BeautifulSoup as soup
import csv

f= open("pg1.html")
page_soup = soup(f.read(), "html.parser")

tables = page_soup.select('table')
table_length = len(tables)

i = 0

temp_list = []

f = csv.writer(open("Crawling.csv", "w"))
f. writerow(["Name", "Date"])

while i < table_length:
     selected_table = tables[i]

     #body
     body1 = selected_table.find('font', color="#1061E2") #<font color="#1061E2">

     #f.writerow(body1.get_text())
     print (body1.get_text().strip())
     #f.writerow(body1.get_text().strip)
     i=i+3
     
     
f.close()
"""
#=====================================================================

#면, 발행일 
import csv
from bs4 import BeautifulSoup as soup

f= open("pg1.html")
page_soup = soup(f.read(), "html.parser")

tables = page_soup.select('table')
table_length = len(tables)
i = 2
result = []

while i < table_length:
     selected_table = tables[i]
     #date
     date = selected_table.find('font', "wiz303") 
     print (date.get_text())
     result.append(date)

     i=i+3

#print (result[0])
#print (len(result[0]))
#print (result)

f.close()

"""


#===============================================================

from bs4 import BeautifulSoup as soup

f= open("pg1.html")
page_soup = soup(f.read(), "html.parser")

tables = page_soup.select('table')

table_length = len(tables)
i = 2
result = []
while i < table_length:
     selected_table = tables[i]

     #date
     date = selected_table.find('font', "wiz304") 
     print (date.get_text())
     i=i+3

f.close()
"""