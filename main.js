const form = document.getElementById('entryForm');

// Set up SVG
const width = 600, height = 600;
const svg = d3.select("svg")
  .attr("width", width)
  .attr("height", height);

// listen for user selection and build chart
form.addEventListener('change', function(e) {
  const selectedButton = e.target;

  if (selectedButton.name === 'displayType' && selectedButton.type === 'radio') {

    // are we displaying by region
    const byRegion = selectedButton.value.includes("Region");

    buildBubbleChart(selectedButton.value, byRegion);
  }
});

/**
 * Formats the country data to be used in the bubble chart
 * returns formatted data and a set of unique regions
 * @param {Array} data 
 * @param {boolean} byRegion 
 */
function formatData(data, byRegion) {
  let formattedData = {};
  let regionsSet = new Set()

  if (byRegion) {
    // group data by region
    let regionsData = {};

    data.forEach(d => {
      if (d.region in regionsData) {
        regionsData[d.region]["noCountriesRegion"] += 1;
        d.timezones.forEach(tz => regionsData[d.region]["timezones"].add(tz))

      } else {
        regionsData[d.region] = {
          noCountriesRegion: 1,
          timezones: new Set([...d.timezones]),
        };
      }
    });
    regionsSet = new Set([...Object.keys(regionsData)]);

    formattedData = Object.entries(regionsData).map(([regionName, regionData]) => {
      return {
        name: regionName,
        noTimezonesRegion: regionData.timezones.size,
        ...regionData
      }
    });
    

    Object.values(regionsData).forEach(region => {
      region.noTimezonesRegion = region.timezones.size;
    });

  } else {
    formattedData = data.map(d => {
      regionsSet.add(d.region);
      
      return {
        name: d.name,
        alpha3Code: d.alpha3Code,
        region: d.region,
        populationSize: d.population,
        noBorders: d.borders.length,
        noTimezones: d.timezones.length,
        noLanguages: d.languages.length
      }
    });  
  }
  
  return { formattedData, regionsSet };
}

/** Builds a bubble chart based on the selected display type
 * @param {string} displayType 
 * @param {boolean} byRegion 
 */
function buildBubbleChart(displayType, byRegion) {

  // Remove all previous chart elements from SVG
  svg.selectAll("*").remove();
  d3.json("data/countries.json").then(function(data) {

    const format = d3.format(",");

    const { formattedData, regionsSet } = formatData(data, byRegion);

    function circleColour(d, i, byRegion) {
      // if displaying data by region give a unique colour else group regions by colour
      if (byRegion) {
        return d3.schemeCategory10[i % 10];
      } else {
        var myColor = d3.scaleOrdinal()
          .domain(regionsSet)
          .range(d3.schemeSet2);  

        return myColor(d.region);
      }
    } 

    function getLabel(d, byRegion) {
      if (byRegion) {
        return `${d.name}\nNo. Countries: ${d.noCountriesRegion}\nNo. Timezones: ${d.noTimezonesRegion}`;
      } else {
        return `${d.name} (${d.alpha3Code})\n${d.region}\n${format(d[displayType])}`;
      }
    }

    // Create a scale for bubble radius
    const popExtent = d3.extent(formattedData, d => d[displayType]);

    const radiusScale = d3.scaleLinear()
      .domain(popExtent)
      .range([2, 50]); // Adjust min/max bubble size

    // Use d3.forceSimulation for bubble placement
    const simulation = d3.forceSimulation(formattedData)
      .force("charge", d3.forceManyBody().strength(1))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(d => radiusScale(d[displayType]) + 2))
      .on("tick", ticked);
    
    // Draw bubbles
    const node = svg.selectAll("g")
      .data(formattedData)
      .enter().append("g")

    node.append("circle")
      .attr("r", d => radiusScale(d[displayType]))
      .attr("fill", (d, i) =>  circleColour(d, i, byRegion));
      
    // Add a tooltip.
    node.append("title")
        .text(d => getLabel(d, byRegion));


    // // Trying to add a label.
    // const text = node.append("text")
    //     .attr("clip-path", d => `circle(${radiusScale(d.population)})`);

    // // Add a tspan
    // text.selectAll()
    //   .data(d => d.alpha3Code)
    //   .join("tspan")
    //     .attr("x", 0)
    //     .attr("y", (d, i, nodes) => `${i - nodes.length / 2 + 0.35}em`)
    //     .text(d => d);

    // // Add a tspan for the node’s value.
    // text.append("tspan")
    //     .attr("x", 0)
    //     .attr("y", d => `${d.alpha3Code.length / 2 + 0.35}em`)
    //     .attr("fill-opacity", 0.7)
    //     .text(d => format(d.population));

    function ticked() {
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    }
  });

};
