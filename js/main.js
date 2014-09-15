'use strict';

var m_width = d3.select('#map').property('width'),
    svg_width = 1200,
    width = 938, // width of map
    height = 500,
    country, // country zoomed in at the moment
    r = 2; // radius of points

var categories = [];

var projection = d3.geo.mercator()
    /*.center([50, 150])*/
    .scale(150)
    .translate([width / 2, height / 1.5]);

var path = d3.geo.path()
    .projection(projection);
/*
var svg = d3.select('#map').append('svg')
    .attr('preserveAspectRatio', 'xMidYMid')
    .attr('viewBox', '0 0 ' + width + ' ' + height)
    .attr('width', m_width)
    .attr('height', m_width * height / width);
*/
var svg = d3.select('#map').append('svg')
    .attr('width', svg_width)
    .attr('height', height);

var tooltip = d3.select('#tooltip');

svg.append('rect')
    .attr('class', 'background')
    .attr('width', width)
    .attr('height', height);

var g = svg.append('g')

d3.json('map.json', function(mapError, mapData) {
  d3.csv('data.csv', function(panthError, panthData) {
    d3.json('domains.json', function(categoriesError, categoriesData) {
      init(mapData, panthData, categoriesData);
    });
  });
});

var init = function(mapData, panthData, categoriesData) {
  g.append('g')
    .attr('id', 'countries')
    .selectAll('path')
    .data(topojson.feature(mapData, mapData.objects.countries).features)
    .enter()
    .append('path')
    .attr('id', function(d) { return d.id; })
    .attr('d', path)
    //.on('click', country_clicked);
  refresh(panthData);
  optionsMenu(panthData);
  categoriesMenu(categoriesData, panthData);
}

var categoriesMenu = function(categoriesData, panthData) {
  var domains = svg.selectAll('.domain')
    .data(categoriesData, function(d) { return d.name; });
  
  var domains_g = domains.enter()
    .append('g')
      .attr('class', 'domain')
      .attr('transform', function(d, i) {
        return 'translate(985,' + (130 + 20 * i) + ')';
      });
  domains_g.append('rect')
    .attr('x', -30)
    .attr('y', -15)
    .attr('width', 180)
    .attr('height', 20)
    .attr('fill', 'white');

  domains_g.append('text')
    .attr('class', 'domain_text')
    .attr('x', 15)
    .text(function(d) { return d.name.capitalize(); });

  domains_g.append('text')
    .attr('class', 'domain_counter')
    .attr('text-anchor', 'end')
    .text(function(d) { return d.number; });

  domains.on('click', function(d) {
    selectDomain(categoriesData, panthData, d);
  });

  selectDomain(categoriesData, panthData, categoriesData[0]);
}

var selectDomain = function(categoriesData, panthData, selected) {
  var domains = svg.selectAll('.domain');

  // Change style of selected item.
  domains.classed('selected', function(d) {
    return d === selected;
  });

  // Refresh map with all points from the domain.
  var data;
  if (selected.name === 'All') {
    data = panthData;
  } else {
    data = panthData.filter(function(d) { return d.domain === selected.name; });
  }
  refresh(data);

  // Refresh occupations list
  var options = d3.select('#occupation')
        .selectAll('.occupation')
        .data(selected.occupations, function(d) { return d.name; });

  options.enter()
    .append('option')
      .attr('class', 'occupation')
      .property('value', function (d) { return d.name; })
      .text(function(d) { return d.name.capitalize() + ' (' + d.number + ')' });

  options.exit()
    .remove();
}

// Init occupation select menu
var optionsMenu = function (panthData) {
  var select = d3.select('#occupation').on('change', function() {
    var choice = select.property('value').toUpperCase();
    if (choice !== 'CHOOSE OCCUPATION') {
      refresh(panthData.filter(function(d) { return d.occupation === choice; }));
    } else {
      refresh(panthData);
    }
  });
}

String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
}

var refresh = function(data) {
  data.sort(function(a, b) {
    return +a.birthyear - +b.birthyear;
  });
  var people = svg.selectAll('.person')
    .data(data, function(d) { return d.en_curid; });

  var colors = d3.scale.linear()
      .domain([0, data.length - 1])
      .range(['#3333ff', '#ff3333']);

  people.enter()
    .append('circle')
      .attr('class', 'person')
      .attr('cx', function(d) { return projection([d.longitude, d.latitude])[0]; })
      .attr('cy', function(d) { return projection([d.longitude, d.latitude])[1]; })
      .attr('r', r)
      .attr('fill', function(d, i) { return colors(i); })
      .attr('opacity', 0)
      .on('mouseover', function(d) {
        var pos = projection([d.longitude, d.latitude]);
        tooltipShow([
          d.name, 
          d.birthyear, 
          d.occupation.capitalize()
        ].join('<br>'), pos[0] - 16 - r, pos[1] + 16 + r);
      })
      .on('mouseout', function(d) {
        tooltipOut();
      })
      .transition().duration(800)
      .attr('opacity', 1);
  
  people.exit()
    .transition().duration(800)
    .style('opacity', 0)
    .remove();

}

// ================
//     Zooming
// ================

var zoom = function(xyz) {
  g.transition()
    .duration(750)
    .attr('transform', 'translate(' + projection.translate() + ')scale(' + xyz[2] + ')translate(-' + xyz[0] + ',-' + xyz[1] + ')')
    .selectAll(['#countries'])
    .style('stroke-width', 1.0 / xyz[2] + 'px')
    .attr('d', path.pointRadius(20.0 / xyz[2]));

  svg.selectAll('.person').enter()
    .duration(750)
    .attr('transform', 'translate(' + projection.translate() + ')scale(' + xyz[2] + ')translate(-' + xyz[0] + ',-' + xyz[1] + ')')
    .selectAll(['#countries'])
    .attr('stroke-width', 1.0 / xyz[2] + 'px')
    .attr('d', path.pointRadius(20.0 / xyz[2]));
  //svg.selectAll('.person')
  //  .attr('cx', function(d) { return projection([d.longitude, d.latitude])[0]; })
  //  .attr('cy', function(d) { return projection([d.longitude, d.latitude])[1]; });
}

var get_xyz = function(d) {
  var bounds = path.bounds(d),
      w_scale = (bounds[1][0] - bounds[0][0]) / width,
      h_scale = (bounds[1][1] - bounds[0][1]) / height,
      z = .96 / Math.max(w_scale, h_scale),
      x = (bounds[1][0] + bounds[0][0]) / 2,
      y = (bounds[1][1] + bounds[0][1]) / 2 + (height / z / 6);
  return [x, y, z];
}

var country_clicked = function(d) {
  if (country) {
    g.selectAll('#' + country.id).style('display', null);
  }

  if (d && country !== d) {
    country = d;
    zoom(get_xyz(d));
  } else {
    country = null;
    zoom([width / 2, height / 1.5, 1])
  }
}

// ================
//     Tooltips
// ================

var tooltipShow = function(html, x, y) {
  tooltip
    .style('display', 'inline')
    .style('left', x + 'px')
    .style('top', y + 'px')
    .html(html);
}

var tooltipOut = function() {
  tooltip
    .style('display', 'none');
}
/*
$(window).resize(function() {
  var w = $('#map').width();
  svg.attr('width', w);
  svg.attr('height', w * height / width);
});
*/