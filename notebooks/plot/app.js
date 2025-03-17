let chart;
let data;

// Default values
const DEFAULT_DISEASE = '发热伴';
const DEFAULT_COUNTY = '历城区';
const DEFAULT_START_DATE = '2020-01-01';
const DEFAULT_END_DATE = '2020-12-31';


// Fetch and process data
async function loadData() {
    
    const response = await fetch('df_data_raw_timesfm.csv');
    const csvText = await response.text();
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
    startDateInput.value = DEFAULT_START_DATE;
    endDateInput.value = DEFAULT_END_DATE;

    // Initial plot
    updatePlot();
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

function updatePlot() {
    const disease = document.getElementById('diseaseSelect').value;
    const county = document.getElementById('countySelect').value;
    
    const filteredData = filterData(disease, county);

    const chartData = {
        labels: filteredData.map(row => row.onset_date),
        datasets: [
            {
                label: '真实病例数',
                data: filteredData.map(row => row.number_of_cases),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            },
            {
                label: 'TimesFM',
                data: filteredData.map(row => row.raw_timesfm),
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1
            },
            {
                label: 'TimesFM+协变量',
                data: filteredData.map(row => row.cov_timesfm),
                borderColor: 'rgb(54, 162, 235)',
                tension: 0.1
            },
            {
                label: '协变量',
                data: filteredData.map(row => row.ols_timesfm),
                borderColor: 'rgb(153, 102, 255)',
                tension: 0.1
            }
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
}

// Event listeners
document.getElementById('diseaseSelect').addEventListener('change', updatePlot);
document.getElementById('countySelect').addEventListener('change', updatePlot);
document.getElementById('startDate').addEventListener('change', updatePlot);
document.getElementById('endDate').addEventListener('change', updatePlot);


// Initialize
loadData();