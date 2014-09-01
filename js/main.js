'use strict';

var m_width = $('#map').width(),
    width = 938,
    height = 500;

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
    .attr('width', width)
    .attr('height', height);

var tooltip = d3.select('#tooltip');

var fisheye = d3.fisheye.circular()
    .radius(200)
    .distortion(2);

svg.append('rect')
    .attr('class', 'background')
    .attr('width', width)
    .attr('height', height);
    /*.on('mousemove', function() {
      fisheye.focus(d3.mouse(this));

      svg.selectAll('.person')
          .each(function(d) { d.fisheye = fisheye(d); })
          .attr('cx', function(d) { return d.fisheye.x; })
          .attr('cy', function(d) { return d.fisheye.y; })
          .attr('r', function(d) { return d.fisheye.z * 4.5; });
      /*
      link.attr('x1', function(d) { return d.source.fisheye.x; })
          .attr('y1', function(d) { return d.source.fisheye.y; })
          .attr('x2', function(d) { return d.target.fisheye.x; })
          .attr('y2', function(d) { return d.target.fisheye.y; });
      
    });*/
    //.on('click', country_clicked)

var g = svg.append('g')

d3.json('../map.json', function(mapError, mapData) {
  d3.csv('../data.csv', function(panthError, panthData) {
    init(mapData, panthData);
  });
});

var init = function(mapData, panthData) {
  getCategoriesFromData(panthData);
  g.append('g')
    .attr('id', 'countries')
    .selectAll('path')
    .data(topojson.feature(mapData, mapData.objects.countries).features)
    .enter()
    .append('path')
    .attr('id', function(d) { return d.id; })
    .attr('d', path);
    //.on('click', country_clicked);
  // var element = categories[Math.floor(Math.random() * categories.length)]
  // panthData.filter(function(d) { return d.occupation === element; })
  refresh(panthData);
}

var uniqueValues = function(data) {
  var dict = {};
  var result = [];
  data.forEach(function(element, index, array) {
    if (!(element in dict)) {
      result.push(element);
      dict[element] = true;
    }
  });
  return result;
}

String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
}

var getCategoriesFromData = function(data) {
  var domains = [];
  var occupations = [];
  data.forEach(function(element, index, array) {
    domains.push(element.domain.capitalize());
    occupations.push(element.occupation.capitalize());
  });
  domains = uniqueValues(domains).sort();
  occupations = uniqueValues(occupations).sort();
  /*
  var domain = $('#domain ul');
  domains.forEach(function(element, index, array) {
    domain.append('<li>' + element + '</li>');
  });
  */
  var occupation = $('#occupation');
  occupations.forEach(function(element, index, array) { 
    occupation.append('<option>' + element + '</option>')
  });
  occupation.change(function() {
    var choice = occupation.val().toUpperCase();
    if (choice !== 'CHOOSE CATEGORY') {
      refresh(data.filter(function(d) { return d.occupation === choice; }));
    } else {
      refresh(data);
    }
  });
}

var r = 2;

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
      .on('mouseover', function(d) {
        var pos = projection([d.longitude, d.latitude]);
        tooltipShow([d.name, d.birthyear, d.occupation.capitalize()].join('<br>'), pos[0] - 16 - r, pos[1] + 16 + r);
      })
      .on('mouseout', function(d) {
        tooltipOut();
      });
//.attr('stroke', );

  people
    .attr('fill', function(d, i) { return colors(i); });
    
  people.exit()
    .remove();
}

/*
var zoom = function(xyz) {
  g.transition()
    .duration(750)
    .attr('transform', 'translate(' + projection.translate() + ')scale(' + xyz[2] + ')translate(-' + xyz[0] + ',-' + xyz[1] + ')')
    .selectAll(['#countries'])
    .style('stroke-width', 1.0 / xyz[2] + 'px')
    .attr('d', path.pointRadius(20.0 / xyz[2]));
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
*/

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