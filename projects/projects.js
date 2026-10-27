import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Load project data and find page elements.
const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');

// Store both filters independently.
let query = '';
let selectedYear = null;

// Keep year colors consistent across searches.
let colors = d3.scaleOrdinal(d3.schemeTableau10)
    .domain(projects.map((project) => project.year));

// Search across all project metadata, ignoring capitalization.
function getSearchResults() {
    return projects.filter((project) => {
        let values = Object.values(project).join('\n').toLowerCase();

        return values.includes(query.toLowerCase());
    });
}

// Apply BOTH the search query and selected year to the cards.
function updateProjectCards() {
    let visibleProjects = getSearchResults();

    if (selectedYear !== null) {
        visibleProjects = visibleProjects.filter(
            (project) => project.year === selectedYear
        );
    }

    renderProjects(visibleProjects, projectsContainer, 'h2');

    if (projectsTitle) {
        projectsTitle.textContent = `Projects (${visibleProjects.length})`;
    }
}

// Draw the chart using projects that match the search.
function renderPieChart(projectsGiven) {
    let rolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year,
    );

    let data = rolledData.map(([year, count]) => {
        return {
            value: count,
            label: year,
        };
    });

    let arcGenerator = d3.arc()
        .innerRadius(0)
        .outerRadius(50);

    let sliceGenerator = d3.pie().value((d) => d.value);
    let arcData = sliceGenerator(data);
    let arcs = arcData.map((d) => arcGenerator(d));

    let svg = d3.select('#projects-pie-plot');
    let legend = d3.select('.legend');

    svg.selectAll('path').remove();
    legend.selectAll('li').remove();

    // Match the stored year to its current position in the chart.
    function updateSelectionHighlight() {
        let selectedIndex = data.findIndex(
            (d) => d.label === selectedYear
        );

        svg.selectAll('path')
            .classed('selected', (_, idx) => idx === selectedIndex)
            .attr('aria-pressed', (_, idx) =>
                idx === selectedIndex ? 'true' : 'false'
            );

        legend.selectAll('li')
            .classed('selected', (_, idx) => idx === selectedIndex)
            .attr('aria-pressed', (_, idx) =>
                idx === selectedIndex ? 'true' : 'false'
            );
    }

    function toggleSelection(i) {
        let clickedYear = data[i].label;

        selectedYear = selectedYear === clickedYear
            ? null
            : clickedYear;

        updateSelectionHighlight();
        updateProjectCards();
    }

    // Draw selectable slices.
    arcs.forEach((arc, idx) => {
        svg
            .append('path')
            .attr('d', arc)
            .attr('fill', colors(data[idx].label))
            .attr('tabindex', 0)
            .attr('role', 'button')
            .attr(
                'aria-label',
                `Filter projects from ${data[idx].label}`
            )
            .on('click', () => toggleSelection(idx))
            .on('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleSelection(idx);
                }
            });
    });

    // Draw selectable legend entries.
    data.forEach((d, idx) => {
        legend
            .append('li')
            .attr('class', 'legend-item')
            .attr('style', `--color: ${colors(d.label)}`)
            .attr('tabindex', 0)
            .attr('role', 'button')
            .attr('aria-label', `Filter projects from ${d.label}`)
            .html(
                `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`
            )
            .on('click', () => toggleSelection(idx))
            .on('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleSelection(idx);
                }
            });
    });

    updateSelectionHighlight();
}

// Initial page display.
updateProjectCards();
renderPieChart(getSearchResults());

// Update both views when the search changes.
// Keep the selected year so both filters work in either order.
searchInput.addEventListener('input', (event) => {
    query = event.target.value;

    updateProjectCards();
    renderPieChart(getSearchResults());
});