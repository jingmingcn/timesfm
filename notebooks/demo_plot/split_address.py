import pandas as pd
import re

def split_address(address):
    # 移除"居民委员会"等后缀
    address = re.sub(r'(居民委员会|村民委员会)$', '', address)
    
    # 提取各级行政区域
    province = '山东省'  # 固定为山东省
    
    # 使用正则表达式匹配各级行政区域
    city_match = re.search(r'山东省(.*?市)', address)
    district_match = re.search(r'市(.*?区)', address)
    street_match = re.search(r'区(.*?街道)', address)
    community_match = re.search(r'街道(.*?)$', address)
    
    # 获取匹配结果
    city = city_match.group(1) if city_match else ''
    district = district_match.group(1) if district_match else ''
    street = street_match.group(1) if street_match else ''
    community = community_match.group(1) if community_match else ''
    
    return province, city, district, street, community

# 读取CSV文件
df = pd.read_csv('village.csv', delimiter='\t')

# 应用拆分函数
split_results = df['地点'].apply(split_address)
df['省'] = split_results.apply(lambda x: x[0])
df['市'] = split_results.apply(lambda x: x[1])
df['区县'] = split_results.apply(lambda x: x[2])
df['街道'] = split_results.apply(lambda x: x[3])
df['社区'] = split_results.apply(lambda x: x[4])

# 保存结果
df.to_csv('village_split.csv', index=False)
print("处理完成，结果已保存到 village_split.csv")