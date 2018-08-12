/* main.js by Vlad Sliusar, 2018 */

//self-executing anonymous function to move to local scope
(function(){
    //pseudo-global variables
    //list of attributes
    var attrArray = ["Expenditure_as_%_of_GDP", "Expenditure_Total", "Expenditure_by_Business", "Expenditure_by_Government","Expenditure_by_Universities","Expenditure_by_Non_Profit","Number_of_Researchers"];

    var expressed = attrArray[0]; //initial attribute

    //padding for coordinated bar chart
    var leftPadding = 50,
        rightPadding = 10,
        bottomPadding = 50;

    //dimensions of the chart's frame
    var width1 = parseInt(d3.select("#vizCardInfo").style('width'));
    var width2 = parseInt(d3.select("#vizCardInfo").style('width')) - leftPadding - 25;
    var height1 = parseInt(d3.select("#vizCardInfo").style('height'));
    var height2 = parseInt(d3.select("#vizCardInfo").style('height')) - bottomPadding;

    //calculate range and domains
    var domainBarMin = 0;
    var domainBarMax = 5;
    var domainYAxisMin = 0;
    var domainYAxisMax = 5;

    //formatting numbers with d3
    var formatComma = d3.format(",")

    /*var chart = d3.select("#vizCardInfo")
          .append("svg")
          .attr("width", w1)
          .attr("height", h1)
          .attr("class", "chart");*/

    var chart = d3.select("#vizCard")
        .classed("svg-container2", true) //container class to make it responsive
        .append("div")
        .append("svg")
        //responsive SVG needs these 2 attributes and no width and height attr
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 500 300")
        .attr("class", "chart")
        //class to make it responsive
        .classed("svg-content-responsive2", true);


    //create a scale to size bars proportionally to frame
    var yScale = d3.scaleLinear()
        .range([0, height2])
        .domain([domainBarMin,domainBarMax]);

    //create vertical axis generator
    var yAxis = d3.scaleLinear()
        .range([height2, 0])
        .domain([domainYAxisMin,domainYAxisMax]);

    //place axis on the chart
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", "translate("+leftPadding+","+bottomPadding/2+")")
        .call(d3.axisLeft(yAxis));

    //move country polygons to front
    d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
    this.parentNode.appendChild(this);
    });
    };

    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap(){

        //map frame dimensions
        var width = 910,
            height = 450;

        /*//create new svg container for the map
        var map = d3.select("#cardMap")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height)*/

        //create new svg container for the map
        var map = d3.select("#cardMap")
            .classed("svg-container", true) //container class to make it responsive
            .append("div")
            .append("svg")
            //responsive SVG needs these 2 attributes and no width and height attr
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", "0 1 910 450")
            .attr("class", "map")
            //class to make it responsive
            .classed("svg-content-responsive", true);



          //create projection
          var projection = d3.geoNaturalEarth1()
            //.center([0, 0])
            //.rotate([0, 0, 0])
            //.scale(150)
              .translate([width / 2, height / 1.8]);

          // create a path generator
          var path = d3.geoPath()
              .projection(projection);


          d3.csv("data/RD_Investment_byCountry.csv").then(function(csvData) {
          //console.log(csvData);
          //create the color scale
          d3.json("data/UIA_World_Countries_Boundaries.topojson").then(function(countries) {

          //translate World topojson into geojson
          var worldCountries = topojson.feature(countries, countries.objects.UIA_World_Countries_Boundaries).features;
          //console.log(worldCountries)


          //place graticule on the map
          setGraticule(map, path);

          //join csv data to GeoJSON enumeration units (countries)
          worldCountries = joinData(worldCountries, csvData);
          //console.log(worldCountries)

          var colorScale = makeColorScale(csvData, expressed);

          //add enumeration units (countries) to the map
          setEnumerationUnits(worldCountries, map, path, colorScale);

          //add coordinated visualization to the map
          setChart(csvData, colorScale);

          createDropdown(csvData);


          }); //csv close
          }); //json close

    }; //end of setMap()


    function setGraticule(map, path){
        //create graticule generator
        var graticule = d3.geoGraticule()
        .step([20, 20]); //place graticule lines every 20 degrees of longitude and latitude

        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assign class for styling
            .attr("d", path) //project graticule

        //create graticule lines
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines
    };


    function joinData(worldCountries, csvData){
        //loop through csv to assign each set of csv attribute values to geojson country
        for (var i=0; i<csvData.length; i++){
            var csvCountry = csvData[i]; //the current country

            var csvKey = csvCountry.Country; //the CSV primary key
            //console.log(csvKey)
            //loop through geojson countries to find correct country
            for (var a=0; a<worldCountries.length; a++){

                var geojsonProps = worldCountries[a].properties; //the current country geojson properties

                var geojsonKey = geojsonProps.Country; //the geojson primary key
                //console.log(geojsonKey)
                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){

                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvCountry[attr]) //.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,"); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                  });
              };
          };
      };
        //console.log(worldCountries)
        return worldCountries;

    };


    //add countries to map as enumeration units colored by data
    function setEnumerationUnits(worldCountries, map, path, colorScale){
        var countries = map.selectAll(".countries")
            .data(worldCountries)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "countries " + d.properties.Country;
            })
            .attr("d", path)
            .style("fill", function(d){
            return choropleth(d.properties, colorScale);
            })
            .on("mouseover", function(d){
              highlight(d.properties);
              var sel = d3.select(this);
              sel.moveToFront();
            })
            .on("mouseout", function(d){
              dehighlight(d.properties);
            })
            .on("mousemove", moveLabel)

        var desc = countries.append("desc")
                .text('{"stroke": "gray", "stroke-width": "0.4px"}');
    };


    //function to create color scale generator
    function makeColorScale(csvData, expressed){
        //color ranges for attributes
        var red = [
          "#fee5d9",
          "#fcae91",
          "#fb6a4a",
          "#de2d26",
          "#a50f15"
        ];
        var green = [
          "#d7f2cd",
          "#bae4b3",
          "#74c476",
          "#31a354",
          "#006d2c"
        ];
        var orange = [
          "#feebe2",
          "#fdbe85",
          "#fd8d3c",
          "#e6550d",
          "#a63603"
        ];

        var colorArray = [attrArray[0], red, attrArray[1], orange,  attrArray[2],orange, attrArray[3],orange,
                             attrArray[4], orange,  attrArray[5], orange,  attrArray[6], green]

        //change colors when attributes are changed
        var selectedColor = colorArray[colorArray.indexOf(expressed)+1];

        //create color scale generator
        var colorScale = d3.scaleThreshold()
            .range(selectedColor);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<csvData.length; i++){
            var val = parseFloat(csvData[i][expressed]);
            domainArray.push(val);
        };

        //cluster data using ckmeans clustering algorithm to create natural breaks
        var clusters = ss.ckmeans(domainArray, 5);
        //reset domain array to cluster minimums
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });
        //remove first value from domain array to create class breakpoints
        domainArray.shift();

        //assign array of last 4 cluster minimums as domain
        colorScale.domain(domainArray);

        return colorScale;
    };


    //function to test for data value and return color
    function choropleth(props, colorScale){
        //attribute value has to be a number
        var val = parseFloat(props[expressed]);
        //if attribute value exists, assign a color; otherwise assign gray
        if (typeof val == 'number' && !isNaN(val)){
            return colorScale(val);
        } else {
            return "#e8e8e8";
        };
    };


    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData){
        var dropdown = d3.select("#cardMap")
            .append("div")
            .append("select")
            .attr("class", "dropdown")
            .style("font-size","0.9vw")
            .attr("preserveAspectRatio", "xMidYMid meet")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute")
            .style("font-size","0.8vw");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("class", "attrOpt")
            .attr("value", function(d){ return d })
            .text(function(d){return d.replace(/_/g, " ")});

    };


    //function to create coordinated bar chart
    function setChart(csvData, colorScale){

      //set bars for each country
       var bars = chart.selectAll(".bars")
           .data(csvData)
           .enter()
           .append("rect")
           .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
           .attr("class", function(d){
               return "bars " + d.Country;
           })
           .attr("width", width2 / csvData.length -1)
           .on("mouseover", highlight)
           .on("mouseout", dehighlight)
           .on("mousemove", moveLabel);
           //console.log(csvData.length)

       var desc = bars.append("desc")
          .text('{"stroke": "none", "stroke-width": "0px"}');

       var chartTitle = chart.append("text")
           .attr("x", 140)
           .attr("y", 30)
           .attr("class", "chartTitle")
           .text("R&D Expenditure as % of GDP");


        updateChart(expressed, bars, csvData.length, colorScale);
    };



    //dropdown change listener handler
    function changeAttribute(attribute, csvData){
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(csvData, expressed);

        //recolor enumeration units
        var countries = d3.selectAll(".countries")
            .transition()
            .duration(1500)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale)
            });

        var bars = d3.selectAll(".bars")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition() //add animation
        .delay(function(d, i){
            return i * 20
        })
        .duration(700);

        //set chart title for attributes
        if (expressed == attrArray[1]) {
        var chartTitle = chart.select(".chartTitle")
        .attr("x", 90)
        .attr("y", 30)
        .text('R&D Expenditure Total (per capita in USD)');
        } else if (expressed == attrArray[0]){
        var chartTitle = chart.select(".chartTitle")
        .attr("x", 140)
        .attr("y", 30)
        .text('R&D Expenditure as % of GDP');
        } else if (expressed == attrArray[6]) {
        var chartTitle = chart.select(".chartTitle")
        .attr("x", 90)
        .attr("y", 30)
        .text('Number of Researchers per Million Inhabitants');
        } else if (expressed == attrArray[2]){
        var chartTitle = chart.select(".chartTitle")
        .attr("x", 90)
        .attr("y", 30)
        .text('R&D Expenditure by Business (per capita in USD)');
        } else if (expressed == attrArray[3]){
        var chartTitle = chart.select(".chartTitle")
        .attr("x", 90)
        .attr("y", 30)
        .text('R&D Expenditure by Government (per capita in USD)');
        } else if (expressed == attrArray[4]){
        var chartTitle = chart.select(".chartTitle")
        .attr("x", 90)
        .attr("y", 30)
        .text('R&D Expenditure by Universities (per capita in USD)');
        } else if (expressed == attrArray[5]){
        var chartTitle = chart.select(".chartTitle")
        .attr("x", 90)
        .attr("y", 30)
        .text('R&D Expenditure by Non-Profit (per capita in USD)');
      };

        domainUpdate(expressed,bars)
        updateChart(expressed, bars, csvData.length, colorScale);

    }; //end of changeAttribute()



    //function to position, size, and color bars in chart
    function updateChart(expressed, bars, n, colorScale){
        if (expressed == attrArray[1]) {
        leftPadding = 50;
        domainBarMax = 2000;
        } else if (expressed == attrArray[0]){
        leftPadding = 50;
        domainBarMax = 5;
        } else if (expressed == attrArray[6]) {
        leftPadding = 50;
        domainBarMax = 9000;
        } else if (expressed == attrArray[2]){
        leftPadding = 50;
        domainBarMax = 1300;
        } else if (expressed == attrArray[3]){
        leftPadding = 50;
        domainBarMax = 400;
        } else if (expressed == attrArray[4]){
        leftPadding = 50;
        domainBarMax = 550;
        } else if (expressed == attrArray[5]){
        leftPadding = 50;
        domainBarMax = 70;
        } else {
        domainBarMin = 0;
        domainBarMax = 9000;
        leftPadding = 50;
        };

      //create a scale to size bars proportionally to frame
      var yScale = d3.scaleLinear()
          .range([0, height2])
          .domain([domainBarMin,domainBarMax]);

        //position bars
      bars.attr("x", function(d, i){
            return i * (width2 / n) + leftPadding + 2.5;
        })
        .attr("height", function(d){
            return yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d){
            return height2 - yScale(parseFloat(d[expressed]))+ bottomPadding / 1.9;
        })
        .style("fill", function(d){
            return choropleth(d, colorScale)
        });

    };

    function domainUpdate(expressed,bars){
        if (expressed == attrArray[1]) {
        leftPadding = 50;
        domainYAxisMax = 2000; //d3.max(csvData, function(d){return d[expressed]});
        } else if (expressed == attrArray[0]){
        leftPadding = 30;
        domainYAxisMax = 5;
        } else if (expressed == attrArray[6]) {
        leftPadding = 40;
        domainYAxisMax = 9000;
        } else if (expressed == attrArray[2]){
        leftPadding = 50;
        domainYAxisMax = 1300;
        } else if (expressed == attrArray[3]){
        leftPadding = 50;
        domainYAxisMax = 400;
        } else if (expressed == attrArray[4]){
        leftPadding = 50;
        domainYAxisMax = 550;
        } else if (expressed == attrArray[5]){
        leftPadding = 50;
        domainYAxisMax = 70;
        } else {
        domainYAxisMin = 0;
        domainYAxisMax = 9000;
        leftPadding = 40;
        };

       //create vertical axis generator
       var yAxis = d3.scaleLinear()
           .range([height2, 0])
           .domain([domainYAxisMin, domainYAxisMax]);

       //place axis on the chart
       var axis = chart.select(".axis")
           .transition().duration(1200)
           .call(d3.axisLeft(yAxis));
    };



    //function to highlight enumeration units and bars
    function highlight(props){
       //change stroke
       var selected = d3.selectAll("." + props.Country)
           .style("stroke", "white")
           .style("stroke-width", "2");

           setLabel(props);
    };


    //function to reset the element style on mouseout
    function dehighlight(props){
        var selected = d3.selectAll("." + props.Country)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });


        //remove info label
        d3.select(".infolabel")
            .remove();

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];

    };
    };


    //function to create dynamic label
    function setLabel(props){

      //label content
       attrVal = props[expressed]
       //console.log(props)

       //update labels
       if (expressed == attrArray[1]) {
       var labelAttribute = "<h1>" + "$"+ formatComma(attrVal) +
       "</h1><b>" + "per capita" + "</b>";
       } else if (expressed == attrArray[0]){
         var labelAttribute = "<h1>" + formatComma(attrVal) + "%" +
         "</h1><b>" + "of GDP" + "</b>";
       } else if (expressed == attrArray[6]) {
         var labelAttribute = "<h1>" + formatComma(attrVal) +
         "</h1><b>" + "per million inhabitants" + "</b>";
       } else if (expressed == attrArray[2]){
         var labelAttribute = "<h1>" + "$"+ formatComma(attrVal) +
         "</h1><b>" + "per capita" + "</b>";
       } else if (expressed == attrArray[3]){
         var labelAttribute = "<h1>" + "$"+ formatComma(attrVal) +
         "</h1><b>" + "per capita" + "</b>";
       } else if (expressed == attrArray[4]){
         var labelAttribute = "<h1>" + "$"+ formatComma(attrVal) +
         "</h1><b>" + "per capita" + "</b>";
       } else if (expressed == attrArray[5]){
         var labelAttribute = "<h1>" + "$"+ formatComma(attrVal) +
         "</h1><b>" + "per capita" + "</b>";
       };
       //"</h1><b>" + expressed.replace(/_/g, " ") + "</b>"

       //label for undefined object properties
       if ($.type(props.Expenditure_by_Business) === "undefined") {
         var labelAttribute = "<h5>" + "No data"+
         "</h5><b>" + "</b>";
       };

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.Country + "_label")
            .html(labelAttribute);

        var regionName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.Country.replace(/_/g, " "));

    };


    //function to move info label with mouse
    function moveLabel(){
        //get width of label
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;

        //use coordinates of mousemove event to set label coordinates
        var x1 = d3.event.clientX + 10,
            y1 = d3.event.clientY - 75,
            x2 = d3.event.clientX - labelWidth - 10,
            y2 = d3.event.clientY + 25;

        //horizontal label coordinate, testing for overflow
        var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
        //vertical label coordinate, testing for overflow
        var y = d3.event.clientY < 75 ? y2 : y1;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };


})();
