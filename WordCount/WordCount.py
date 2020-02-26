import xlrd 
 
#Change the location of the file
loc = "/Users/soyeon/dev/NewsAnalysis/ChronoAnalysis/Chosun/Data/2019.xlsx"
  
wb = xlrd.open_workbook(loc) 
sheet = wb.sheet_by_index(0) 
  
# Extracting number of columns 
print(sheet.ncols) 
print(sheet.nrows) 

data = [] # Header

for col in range(sheet.ncols):  # Chosun: sheetn.nrows>, Han :sheet.ncols>
    for row in range(sheet.nrows):
        data.append(sheet.cell_value(row,col))
        print(sheet.cell_value(row,col))
data = [x for x in data if x != ''] 

from collections import Counter
import csv
import operator

cnt = Counter()
data_dic = Counter(data)

sorted_x = sorted(data_dic.items(), key=operator.itemgetter(1), reverse=True)

data_list = []
for idx, val in enumerate(sorted_x):
    data_list.append([val[0],str(val[1])])

with open("Chosun19Result.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(data_list)