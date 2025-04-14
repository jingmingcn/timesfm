let chart;
let data;
let mapData;

// Default values
const DEFAULT_DISEASE = '发热伴';
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
            raw_timesfm: parseInt(raw_timesfm),
            cov_timesfm: parseInt(cov_timesfm),
            ols_timesfm: parseInt(ols_timesfm)
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
    const counties = [...new Set(data.map(row => row.county))];

    const diseaseSelect = document.getElementById('diseaseSelect');
    const countySelect = document.getElementById('countySelect');

    diseases.forEach(disease => {
        const option = document.createElement('option');
        option.value = disease;
        option.text = disease;
        diseaseSelect.appendChild(option);
    });

    counties.forEach(county => {
        const option = document.createElement('option');
        option.value = county;
        option.text = county;
        countySelect.appendChild(option);
    });

    // Set default values
    diseaseSelect.value = DEFAULT_DISEASE;
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
    echarts.registerMap('county', geoJson);
    

    // Initialize maps
    const mapOptions = {
        // number_of_cases: { title: 'Number of Cases', div: 'map1' },
        raw_timesfm: { title: 'Raw TimesFM', div: 'map2' },
        // cov_timesfm: { title: 'COV TimesFM', div: 'map3' },
        // ols_timesfm: { title: 'OLS TimesFM', div: 'map4' },
        
    };

    const maps = {};
    for (const [key, config] of Object.entries(mapOptions)) {
        maps[key] = echarts.init(document.getElementById(config.div));
    }

    function updateMaps(filteredMapData) {
        console.log(filteredMapData);
        for (const [key, config] of Object.entries(mapOptions)) {
            const option = {
                title: {
                    text: config.title,
                    left: 'center'
                },
                tooltip: {
                    trigger: 'item',
                    formatter: '{b}: {c}'
                },
                visualMap: {
                    min: Math.min(...filteredMapData.map(item => item[key])),
                    max: Math.max(...filteredMapData.map(item => item[key])),
                    left: 'left',
                    top: 'bottom',
                    text: ['High', 'Low'],
                    realtime: false,
                    calculable: true,
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
                series: [{
                    name: config.title,
                    type: 'map',
                    map: 'county',
                    roam: false,
                    center: [118.0, 36.65],
                    zoom: 1,
                    label: {
                        show: false
                      },
                    data: filteredMapData.map(item => ({
                        name: item.county,
                        value: item[key]
                    }))
                }]
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
                label: 'TimesFM',
                data: filteredData.map(row => row.raw_timesfm),
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
                        text: 'Date'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Value'
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