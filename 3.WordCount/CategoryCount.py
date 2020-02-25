import xlrd 
 
#Change the location of the file
loc = "/Users/soyeon/dev/khaiii/test.xlsx"

wb = xlrd.open_workbook(loc) 
sheet = wb.sheet_by_index(0) 

# Extracting number of columns 
print(sheet.ncols) 
print(sheet.nrows) 

data = []

#for row 0 and column 0
sheet.cell_value(0,0)
for i in range(sheet.ncols): 
    print(sheet.cell_value(0, i)) 
    data.append(sheet.cell_value(0,i))

from collections import Counter
import csv
import operator

cnt = Counter()
data_dic = Counter(data)

sorted_x = sorted(data_dic.items(), key=operator.itemgetter(1), reverse=True)

data_list = []
for idx, val in enumerate(sorted_x):
    data_list.append([val[0],str(val[1])])

with open("hanCategoryResult.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(data_list)
