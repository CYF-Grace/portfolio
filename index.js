import {
    fetchJSON,
    renderProjects,
    fetchGitHubData
} from './global.js';

const projects = await fetchJSON('./lib/projects.json');

const projectsContainer = document.querySelector('.projects');

if (Array.isArray(projects)) {
    const latestProjects = projects.slice(0, 3);

    renderProjects(latestProjects, projectsContainer, 'h2');
} else if (projectsContainer) {
    projectsContainer.textContent = 'Unable to load projects.';
}

const githubData = await fetchGitHubData('CYF-Grace');

const profileStats = document.querySelector('#profile-stats');

if (profileStats) {
    if (githubData) {
        profileStats.innerHTML = `
            <dl>
                <dt>Public Repos</dt>
                <dd>${githubData.public_repos}</dd>

                <dt>Public Gists</dt>
                <dd>${githubData.public_gists}</dd>

                <dt>Followers</dt>
                <dd>${githubData.followers}</dd>

                <dt>Following</dt>
                <dd>${githubData.following}</dd>
            </dl>
        `;
    } else {
        profileStats.textContent = 'Unable to load GitHub statistics.';
    }
}