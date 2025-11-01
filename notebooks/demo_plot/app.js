let chart;
let data;
let mapData;
let villageData;

// City/County JSON data
const cityCountyData = {
  "济南市": ["历下区", "市中区", "槐荫区", "天桥区", "历城区", "长清区", "章丘区"],
  "青岛市": ["市南区", "市北区", "黄岛区", "崂山区", "李沧区", "城阳区", "即墨区"],
  "烟台市": ["芝罘区", "福山区", "牟平区", "莱山区", "蓬莱区", "龙口市", "莱阳市"],
  "潍坊市": ["潍城区", "寒亭区", "坊子区", "奎文区", "青州市", "诸城市", "寿光市"],
  "淄博市": ["张店区", "淄川区", "博山区", "临淄区", "周村区", "桓台县", "高青县"],
  "济宁市": ["任城区", "兖州区", "曲阜市", "邹城市", "鱼台县", "金乡县", "嘉祥县"],
  "泰安市": ["泰山区", "岱岳区", "新泰市", "肥城市", "东平县"],
  "威海市": ["环翠区", "文登区", "荣成市", "乳山市"],
  "日照市": ["东港区", "岚山区", "五莲县", "莒县"],
  "枣庄市": ["薛城区", "峄城区", "台儿庄区", "山亭区", "滕州市"],
  "东营市": ["东营区", "河口区", "垦利区", "利津县", "广饶县"],
  "莱芜市": ["莱城区", "钢城区"],
  "临沂市": ["兰山区", "罗庄区", "河东区", "沂南县", "郯城县", "沂水县"],
  "德州市": ["德城区", "陵城区", "乐陵市", "禹城市", "临邑县", "齐河县"],
  "聊城市": ["东昌府区", "临清市", "阳谷县", "莘县"],
  "滨州市": ["滨城区", "沾化区", "邹平县", "惠民县"],
  "菏泽市": ["牡丹区", "鄄城县", "单县", "定陶区"],
  // 可继续添加更多市县
};

const centers = {
    "山东省": [118, 36.65],
  "济南市": [117.000923, 36.675807],
  "青岛市": [120.355173, 36.082982],
  "烟台市": [121.309555, 37.536562],
  "潍坊市": [119.161755, 36.706774],
  "淄博市": [118.059134, 36.804685],
  "济宁市": [116.587245, 35.415393],
  "泰安市": [117.089414, 36.188078],
  "威海市": [122.093958, 37.528787],
  "日照市": [119.50718, 35.420225],
  "枣庄市": [117.279305, 34.807883],
  "东营市": [118.583926, 37.487121], 
    "莱芜市": [117.677736, 36.214397],
    "临沂市": [118.356448, 35.104672],
    "德州市": [116.328161, 37.460826],
    "聊城市": [115.985343, 36.456013],
    "滨州市": [117.968292, 37.405314],
    "菏泽市": [115.469381, 35.246531]
};

const findCityByCounty = function(county) {
  for (const city in cityCountyData) {
    if (cityCountyData[city].includes(county)) {
      return city;
    }
  }
  return null;
};

const diseaseSelect = document.getElementById('diseaseSelect');
// Populate city dropdown
const citySelect = document.getElementById('citySelect');
const countySelect = document.getElementById('countySelect');
for (const city in cityCountyData) {
  const opt = document.createElement('option');
  opt.value = city;
  opt.textContent = city;
  citySelect.appendChild(opt);
}

// Update county dropdown when city changes
citySelect.addEventListener('change', function() {
  const counties = cityCountyData[this.value] || [];
  countySelect.innerHTML = '<option value="">选择县</option>';
  counties.forEach(county => {
    const opt = document.createElement('option');
    opt.value = county;
    opt.textContent = county;
    countySelect.appendChild(opt);
  });
});
// Optionally, trigger change on page load to show counties for first city
// citySelect.dispatchEvent(new Event('change'));

// Default values
const DEFAULT_DISEASE = '发热伴';
const  DEFAULT_CITY = '济南市';
const DEFAULT_COUNTY = '历城区';
const DEFAULT_START_DATE = '2022-01-01';
const DEFAULT_END_DATE = '2022-12-31';


// Fetch and process data
async function loadData() {
    
    const response = await fetch('df_data_raw_timesfm.csv.zip');
    const blob = await response.blob();
    const reader = new zip.ZipReader(new zip.BlobReader(blob));
    const entries = await reader.getEntries();
   
    // get first entry content as text by using a TextWriter
    const csvText = await entries[0].getData(
        // writer
        new zip.TextWriter(),
        // options
        {
            onprogress: (index, max) => {
                // onprogress callback
            }
        }
    );
    const rows = csvText.split('\n').slice(1); // Skip header

    data = rows.map(row => {
        const [id, disease, county, onset_date, number_of_cases, raw_timesfm, cov_timesfm, ols_timesfm] = row.split(',');
        return {
            disease,
            county,
            onset_date: new Date(onset_date),
            number_of_cases: parseInt(number_of_cases),
            // raw_timesfm: parseInt(raw_timesfm),
            // cov_timesfm: parseInt(cov_timesfm),
            // ols_timesfm: parseInt(ols_timesfm)
        };
    });

    const villageCsvResponse = await fetch('village_data.csv');
    const villageCsvText = await villageCsvResponse.text();
    const villageRows = villageCsvText.split('\n').slice(1); // Skip header
    villageData = villageRows.map(row => {
        const [location,long,lat,province,city,county,street,village] = row.split(',');
        return {
            location,
            long,
            lat,
            province,
            city,
            county,
            street,
            village
        };
    });

    // Set min and max dates
    const dates = data.map(row => row.onset_date);
    const minDate = dates.reduce((min, date) => date < min ? date : min, dates[0]);
    const maxDate = dates.reduce((max, date) => date > max ? date : max, dates[0]);

    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    startDateInput.min = minDate.toISOString().split('T')[0];
    startDateInput.max = maxDate.toISOString().split('T')[0];
    endDateInput.min = minDate.toISOString().split('T')[0];
    endDateInput.max = maxDate.toISOString().split('T')[0];

    // Set default date range
    startDateInput.value = minDate.toISOString().split('T')[0];
    endDateInput.value = maxDate.toISOString().split('T')[0];

    // Populate dropdowns
    const diseases = [...new Set(data.map(row => row.disease))];
    // const counties = [...new Set(data.map(row => row.county))];

    diseases.forEach(disease => {
        const option = document.createElement('option');
        option.value = disease;
        option.text = disease;
        diseaseSelect.appendChild(option);
    });

    // counties.forEach(county => {
    //     const option = document.createElement('option');
    //     option.value = county;
    //     option.text = county;
    //     countySelect.appendChild(option);
    // });

    // Set default values
    diseaseSelect.value = DEFAULT_DISEASE;
    citySelect.value = DEFAULT_CITY;
    citySelect.dispatchEvent(new Event('change'));
    countySelect.value = DEFAULT_COUNTY;
    // startDateInput.value = DEFAULT_START_DATE;
    // endDateInput.value = DEFAULT_END_DATE;

    // Initial plot
    updatePlot();
}

async function initializeMaps() {
    // Load GeoJSON data
    const response = await fetch('map_sd_county.geojson');
    const geoJson = await response.json();
    // Register GeoJSON data
    echarts.registerMap('山东省', geoJson);

    for(const city in cityCountyData) {
        var cityGeoJson = {"type": "FeatureCollection", "features": []};
        geoJson.features.forEach(feature => {
            if(city === feature.properties.地级){
                cityGeoJson.features.push(feature);
            }
        });
        echarts.registerMap(city, cityGeoJson);
    }
    

    // Initialize maps
    const mapOptions = {
        // number_of_cases: { title: 'Number of Cases', div: 'map1' },
        "山东省": { title: '山东省', div: 'map2' },
        "市": { title: '', div: 'map3' },
        // ols_timesfm: { title: 'OLS TimesFM', div: 'map4' },
    };

    const maps = {};
    for (const [key, config] of Object.entries(mapOptions)) {
        maps[key] = echarts.init(document.getElementById(config.div),null,{renderer: 'svg' });
    }

    function updateMaps(filteredMapData) {
        const city = document.getElementById('citySelect').value;
        const county = document.getElementById('countySelect').value;
        for (const [key, config] of Object.entries(mapOptions)) {
            let _key = key;
            if(key === "市") {

                if(city) {
                    _key = city;
                    config.title = city;
                } else {
                    continue; // Skip if no city found
                }
            }
            const option = {
                geo: {
                    map: '山东省',
                    roam: true,
                    animation: true,
                    animationDuration: 10000,
                    center: centers[_key] || centers["山东省"],
                    zoom: _key == "山东省" ? 1 : 4,
                },
                title: {
                    text: config.title,
                    left: 'center'
                },
                tooltip: {
                    trigger: 'item',
                    formatter: '{b}: {c}'
                },
                animation: true,
                visualMap: [
                {
                    min: Math.min(...filteredMapData.filter(item=>{// Filter data for the current map
                        if(_key === "山东省") {
                            return true; // Show all counties for province map
                        } else {
                            const cityCounties = cityCountyData[_key] || [];
                            return cityCounties.includes(item.county);
                        }}).map(item => item["number_of_cases"])),
                    max: Math.max(...filteredMapData.filter(item=>{// Filter data for the current map
                        if(_key === "山东省") {
                            return true; // Show all counties for province map
                        } else {
                            const cityCounties = cityCountyData[_key] || [];
                            return cityCounties.includes(item.county);
                        }}).map(item => item["number_of_cases"])),
                    left: 0,
                    bottom: 0,
                    text: ['最高值', '最低值'],
                    realtime: false,
                    calculable: true,
                    seriesIndex: 0,
                    dimension: 0,
                    inRange: {
                        color: [
                        //   '#313695',
                        //   '#4575b4',
                        //   '#74add1',
                        //   '#abd9e9',
                        //   '#e0f3f8',
                          '#ffffbf',
                          '#fee090',
                          '#fdae61',
                          '#f46d43',
                          '#d73027',
                          '#a50026'
                        ]
                    },
                },
                {
                    orient: 'horizontal',
                    calculable: true,
                    right: 0,
                    bottom: 0,
                    seriesIndex: 1,
                    show: _key == "山东省" ? false : true,
                    // min/max is specified as series.data value extent.
                    min: Math.min(...filteredMapData.filter(item=>{// Filter data for the current map
                        if(_key === "山东省") {
                            return true; // Show all counties for province map
                        } else {
                            const cityCounties = cityCountyData[_key] || [];
                            return cityCounties.includes(item.county);
                        }}).map(item => item["number_of_cases"])),
                    max: Math.max(...filteredMapData.filter(item=>{// Filter data for the current map
                        if(_key === "山东省") {
                            return true; // Show all counties for province map
                        } else {
                            const cityCounties = cityCountyData[_key] || [];
                            return cityCounties.includes(item.county);
                        }}).map(item => item["number_of_cases"])),
                    dimension: 2,
                    inRange: {
                        symbolSize: [5, 30]
                    },
                    controller: {
                        inRange: {
                            color: ['#66c2a5']
                        }
                    }
                },
            ],
            series: [
                {
                    name: config.title,
                    type: 'map',
                    map: '',
                    geoIndex: 0,
                    roam: true,
                    label: {
                        show: false
                    },
                    data: filteredMapData.filter(item => {
                        // Filter data for the current map
                        if(_key === "山东省") {
                            return true; // Show all counties for province map
                        } else {
                            const cityCounties = cityCountyData[_key] || [];
                            return cityCounties.includes(item.county);
                        }
                    })
                    .map(item => ({
                        name: item.county,
                        value: item['number_of_cases']
                    }))
                },
                {
                    type: 'scatter',
                    coordinateSystem: 'geo',
                    geoIndex: 0,
                    encode: {
                        // `2` is the dimension index of series.data
                        tooltip: 3,
                        label: 3
                    },
                    data: villageData.filter(village => {
                        // Filter villages for the current map
                        if(_key === "山东省") {
                            return false; // Hide all villages for province map
                        } else {
                            return village.county === county;
                        }
                    }).map(village => [
                        parseFloat(village.long),
                        parseFloat(village.lat),
                        Math.floor(Math.random() * 10 ),// Random value for demonstration
                        village.village
                    ]),
                    
                    itemStyle: {
                        color: '#66c2a5',
                        borderWidth: 1,
                        borderColor: '#3c7865'
                    }
                }
            ] 
            };
            maps[key].setOption(option);
        }
    }

    // Add maps to window resize event
    window.addEventListener('resize', () => {
        Object.values(maps).forEach(map => map.resize());
    });

    return updateMaps;
}

function filterData(disease, county) {
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    
    return data.filter(row => 
        row.disease === disease && 
        row.county === county &&
        row.onset_date >= startDate &&
        row.onset_date <= endDate
    );
}

function filterMapData(disease) {
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    const data_ =  data.filter(row => 
        row.disease === disease && 
        row.onset_date >= startDate &&
        row.onset_date <= endDate
    );

    const groupedData = _.groupBy(data_, 'county');
    return _.map(groupedData, (value, key) => {
        return {
            county: key,
            number_of_cases: _.sumBy(value, 'number_of_cases'),
            raw_timesfm: _.sumBy(value, 'raw_timesfm'),
            cov_timesfm: _.sumBy(value, 'cov_timesfm'),
            ols_timesfm: _.sumBy(value, 'ols_timesfm')
        };
    });
}

async function updatePlot() {
    const disease = document.getElementById('diseaseSelect').value;
    const county = document.getElementById('countySelect').value;
    
    const filteredData = filterData(disease, county);
    const filteredMapData = filterMapData(disease);

    const chartData = {
        labels: filteredData.map(row => row.onset_date),
        datasets: [
            // {
            //     label: '真实病例数',
            //     data: filteredData.map(row => row.number_of_cases),
            //     borderColor: 'rgb(75, 192, 192)',
            //     tension: 0.1
            // },
            {
                label: '发病人数',
                data: filteredData.map(row => row.number_of_cases),
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1
            },
            // {
            //     label: 'TimesFM+协变量',
            //     data: filteredData.map(row => row.cov_timesfm),
            //     borderColor: 'rgb(54, 162, 235)',
            //     tension: 0.1
            // },
            // {
            //     label: '协变量',
            //     data: filteredData.map(row => row.ols_timesfm),
            //     borderColor: 'rgb(153, 102, 255)',
            //     tension: 0.1
            // }
        ]
    };

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(document.getElementById('timeSeriesChart'), {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day'
                    },
                    title: {
                        display: true,
                        text: '日期'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '发病人数'
                    }
                }
            }
        }
    });

    // Update maps
    if (!window.updateMaps) {
        window.updateMaps = await initializeMaps();
    }
    window.updateMaps(filteredMapData);
}

// Event listeners
document.getElementById('diseaseSelect').addEventListener('change', updatePlot);
document.getElementById('countySelect').addEventListener('change', updatePlot);
document.getElementById('startDate').addEventListener('change', updatePlot);
document.getElementById('endDate').addEventListener('change', updatePlot);


// Initialize
loadData();