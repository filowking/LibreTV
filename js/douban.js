// 豆瓣热门电影电视剧推荐功能（使用新接口：https://m.douban.com/rexxar/api/v2/subject/recent_hot/）

// 注意：新接口不支持标签和类型筛选，以下默认标签仅用于 UI 显示
let defaultMovieTags = ['热门', '最新', '经典', '豆瓣高分', '冷门佳片', '华语', '欧美', '韩国', '日本', '动作', '喜剧', '日综', '爱情', '科幻', '悬疑', '恐怖', '治愈'];
let defaultTvTags = ['热门', '美剧', '英剧', '韩剧', '日剧', '国产剧', '港剧', '日本动画', '综艺', '纪录片'];

let movieTags = [];
let tvTags = [];

// 加载用户标签
function loadUserTags() {
    try {
        const savedMovieTags = localStorage.getItem('userMovieTags');
        const savedTvTags = localStorage.getItem('userTvTags');
        if (savedMovieTags) {
            movieTags = JSON.parse(savedMovieTags);
        } else {
            movieTags = [...defaultMovieTags];
        }
        if (savedTvTags) {
            tvTags = JSON.parse(savedTvTags);
        } else {
            tvTags = [...defaultTvTags];
        }
    } catch (e) {
        console.error('加载标签失败：', e);
        movieTags = [...defaultMovieTags];
        tvTags = [...defaultTvTags];
    }
}

// 保存用户标签
function saveUserTags() {
    try {
        localStorage.setItem('userMovieTags', JSON.stringify(movieTags));
        localStorage.setItem('userTvTags', JSON.stringify(tvTags));
    } catch (e) {
        console.error('保存标签失败：', e);
        showToast('保存标签失败', 'error');
    }
}

let doubanMovieTvCurrentSwitch = 'movie';
let doubanCurrentTag = '热门';
let doubanPageStart = 0;
const doubanPageSize = 16;

// 初始化豆瓣功能
function initDouban() {
    const doubanToggle = document.getElementById('doubanToggle');
    if (doubanToggle) {
        const isEnabled = localStorage.getItem('doubanEnabled') === 'true';
        doubanToggle.checked = isEnabled;
        const toggleBg = doubanToggle.nextElementSibling;
        const toggleDot = toggleBg.nextElementSibling;
        if (isEnabled) {
            toggleBg.classList.add('bg-pink-600');
            toggleDot.classList.add('translate-x-6');
        }
        doubanToggle.addEventListener('change', function(e) {
            const isChecked = e.target.checked;
            localStorage.setItem('doubanEnabled', isChecked);
            if (isChecked) {
                toggleBg.classList.add('bg-pink-600');
                toggleDot.classList.add('translate-x-6');
            } else {
                toggleBg.classList.remove('bg-pink-600');
                toggleDot.classList.remove('translate-x-6');
            }
            updateDoubanVisibility();
        });
        updateDoubanVisibility();
        window.scrollTo(0, 0);
    }

    loadUserTags();
    renderDoubanMovieTvSwitch();
    renderDoubanTags();
    setupDoubanRefreshBtn();

    if (localStorage.getItem('doubanEnabled') === 'true') {
        renderRecommend(); // 不再传 tag/type
    }
}

// 更新显示状态
function updateDoubanVisibility() {
    const doubanArea = document.getElementById('doubanArea');
    if (!doubanArea) return;
    const isEnabled = localStorage.getItem('doubanEnabled') === 'true';
    const isSearching = document.getElementById('resultsArea') && !document.getElementById('resultsArea').classList.contains('hidden');
    if (isEnabled && !isSearching) {
        doubanArea.classList.remove('hidden');
        if (document.getElementById('douban-results').children.length === 0) {
            renderRecommend();
        }
    } else {
        doubanArea.classList.add('hidden');
    }
}

// 填充搜索框（不搜索）
function fillSearchInput(title) {
    if (!title) return;
    const safeTitle = title
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = safeTitle;
        input.focus();
        showToast('已填充搜索内容，点击搜索按钮开始搜索', 'info');
    }
}

// 填充并搜索
function fillAndSearch(title) {
    if (!title) return;
    const safeTitle = title
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = safeTitle;
        search();
        try {
            const encodedQuery = encodeURIComponent(safeTitle);
            window.history.pushState(
                { search: safeTitle },
                `搜索: ${safeTitle} - LibreTV`,
                `/s=${encodedQuery}`
            );
            document.title = `搜索: ${safeTitle} - LibreTV`;
        } catch (e) {
            console.error('更新浏览器历史失败:', e);
        }
    }
}

// 填充并搜索（自动启用豆瓣API）
async function fillAndSearchWithDouban(title) {
    if (!title) return;
    const safeTitle = title
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    if (typeof selectedAPIs !== 'undefined' && !selectedAPIs.includes('dbzy')) {
        const doubanCheckbox = document.querySelector('input[id="api_dbzy"]');
        if (doubanCheckbox) {
            doubanCheckbox.checked = true;
            if (typeof updateSelectedAPIs === 'function') {
                updateSelectedAPIs();
            } else {
                selectedAPIs.push('dbzy');
                localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));
                const countEl = document.getElementById('selectedAPICount');
                if (countEl) countEl.textContent = selectedAPIs.length;
            }
            showToast('已自动选择豆瓣资源API', 'info');
        }
    }

    const input = document.getElementById('searchInput');
    if (input) {
        input.value = safeTitle;
        await search();
        try {
            const encodedQuery = encodeURIComponent(safeTitle);
            window.history.pushState(
                { search: safeTitle },
                `搜索: ${safeTitle} - LibreTV`,
                `/s=${encodedQuery}`
            );
            document.title = `搜索: ${safeTitle} - LibreTV`;
        } catch (e) {
            console.error('更新浏览器历史失败:', e);
        }
        if (window.innerWidth <= 768) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
}

// 渲染电影/电视剧切换器（逻辑保留，但实际调用相同接口）
function renderDoubanMovieTvSwitch() {
    const movieToggle = document.getElementById('douban-movie-toggle');
    const tvToggle = document.getElementById('douban-tv-toggle');
    if (!movieToggle || !tvToggle) return;

    movieToggle.addEventListener('click', function() {
        if (doubanMovieTvCurrentSwitch !== 'movie') {
            movieToggle.classList.add('bg-pink-600', 'text-white');
            movieToggle.classList.remove('text-gray-300');
            tvToggle.classList.remove('bg-pink-600', 'text-white');
            tvToggle.classList.add('text-gray-300');
            doubanMovieTvCurrentSwitch = 'movie';
            doubanCurrentTag = '热门';
            renderDoubanTags(movieTags);
            setupDoubanRefreshBtn();
            if (localStorage.getItem('doubanEnabled') === 'true') {
                renderRecommend();
            }
        }
    });

    tvToggle.addEventListener('click', function() {
        if (doubanMovieTvCurrentSwitch !== 'tv') {
            tvToggle.classList.add('bg-pink-600', 'text-white');
            tvToggle.classList.remove('text-gray-300');
            movieToggle.classList.remove('bg-pink-600', 'text-white');
            movieToggle.classList.add('text-gray-300');
            doubanMovieTvCurrentSwitch = 'tv';
            doubanCurrentTag = '热门';
            renderDoubanTags(tvTags);
            setupDoubanRefreshBtn();
            if (localStorage.getItem('doubanEnabled') === 'true') {
                renderRecommend();
            }
        }
    });
}

// 渲染标签（UI 保留）
function renderDoubanTags(tags) {
    const tagContainer = document.getElementById('douban-tags');
    if (!tagContainer) return;

    const currentTags = doubanMovieTvCurrentSwitch === 'movie' ? movieTags : tvTags;
    tagContainer.innerHTML = '';

    const manageBtn = document.createElement('button');
    manageBtn.className = 'py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 bg-[#1a1a1a] text-gray-300 hover:bg-pink-700 hover:text-white border border-[#333] hover:border-white';
    manageBtn.innerHTML = '<span class="flex items-center"><svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>管理标签</span>';
    manageBtn.onclick = function() { showTagManageModal(); };
    tagContainer.appendChild(manageBtn);

    currentTags.forEach(tag => {
        const btn = document.createElement('button');
        let btnClass = 'py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 border ';
        if (tag === doubanCurrentTag) {
            btnClass += 'bg-pink-600 text-white shadow-md border-white';
        } else {
            btnClass += 'bg-[#1a1a1a] text-gray-300 hover:bg-pink-700 hover:text-white border-[#333] hover:border-white';
        }
        btn.className = btnClass;
        btn.textContent = tag;
        btn.onclick = function() {
            if (doubanCurrentTag !== tag) {
                doubanCurrentTag = tag;
                doubanPageStart = 0;
                renderRecommend(); // 忽略 tag，仍加载 same data
                renderDoubanTags();
            }
        };
        tagContainer.appendChild(btn);
    });
}

// 换一批（保留，但实际可能无效）
function setupDoubanRefreshBtn() {
    const btn = document.getElementById('douban-refresh');
    if (!btn) return;
    btn.onclick = function() {
        doubanPageStart += doubanPageSize;
        if (doubanPageStart > 9 * doubanPageSize) {
            doubanPageStart = 0;
        }
        renderRecommend();
    };
}

// 🌟 核心修改：使用新接口
function renderRecommend() {
    const container = document.getElementById("douban-results");
    if (!container) return;

    container.classList.add("relative");
    container.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div class="flex items-center justify-center">
                <div class="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin inline-block"></div>
                <span class="text-pink-500 ml-4">加载中...</span>
            </div>
        </div>
    `;

    const url = "https://m.douban.com/rexxar/api/v2/subject/recent_hot/";

    fetchDoubanData(url)
        .then(data => {
            // 新接口返回结构：{ subjects: [...] }
            renderDoubanCards({ subjects: data.subjects || [] }, container);
        })
        .catch(error => {
            console.error("获取豆瓣近期热门失败：", error);
            container.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <div class="text-red-400">❌ 获取豆瓣数据失败，请稍后重试</div>
                    <div class="text-gray-500 text-sm mt-2">提示：使用VPN可能有助于解决此问题</div>
                </div>
            `;
        });
}

// 通用请求函数（适配新接口）
async function fetchDoubanData(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const fetchOptions = {
        signal: controller.signal,
        headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
            'Referer': 'https://m.douban.com/',
            'Accept': 'application/json, text/plain, */*',
        }
    };

    try {
        let finalUrl = url;
        if (typeof PROXY_URL !== 'undefined' && window.ProxyAuth?.addAuthToProxyUrl) {
            finalUrl = await window.ProxyAuth.addAuthToProxyUrl(PROXY_URL + encodeURIComponent(url));
        } else if (typeof PROXY_URL !== 'undefined') {
            finalUrl = PROXY_URL + encodeURIComponent(url);
        }

        const response = await fetch(finalUrl, fetchOptions);
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    } catch (err) {
        console.error("豆瓣 API 请求失败（直接代理）：", err);
        // 尝试备用代理
        const fallbackUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        try {
            const fallbackResponse = await fetch(fallbackUrl);
            if (!fallbackResponse.ok) throw new Error(`备用API请求失败! 状态: ${fallbackResponse.status}`);
            const data = await fallbackResponse.json();
            if (data && data.contents) return JSON.parse(data.contents);
            else throw new Error("无法获取有效数据");
        } catch (fallbackErr) {
            console.error("豆瓣 API 备用请求也失败：", fallbackErr);
            throw fallbackErr;
        }
    }
}

// 渲染卡片（适配新数据结构）
function renderDoubanCards(data, container) {
    const fragment = document.createDocumentFragment();

    if (!data.subjects || data.subjects.length === 0) {
        const emptyEl = document.createElement("div");
        emptyEl.className = "col-span-full text-center py-8";
        emptyEl.innerHTML = `<div class="text-pink-500">❌ 暂无数据，请稍后重试</div>`;
        fragment.appendChild(emptyEl);
    } else {
        data.subjects.forEach(item => {
            // 新接口字段：item.subject.id, title, rate, cover_url, url, subject_type (movie/tv)
            const id = item.subject?.id || '';
            const title = item.subject?.title || '未知标题';
            const rate = item.subject?.rate || '暂无';
            const cover = item.subject?.cover_url || '';
            const url = item.subject?.url || `https://movie.douban.com/subject/${id}/`;
            const type = item.subject?.subject_type || 'movie'; // 'movie' or 'tv'

            const safeTitle = title
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
            const safeRate = rate
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            const originalCoverUrl = cover;
            const proxiedCoverUrl = typeof PROXY_URL !== 'undefined' ? PROXY_URL + encodeURIComponent(originalCoverUrl) : originalCoverUrl;

            const card = document.createElement("div");
            card.className = "bg-[#111] hover:bg-[#222] transition-all duration-300 rounded-lg overflow-hidden flex flex-col transform hover:scale-105 shadow-md hover:shadow-lg";

            card.innerHTML = `
                <div class="relative w-full aspect-[2/3] overflow-hidden cursor-pointer" onclick="fillAndSearchWithDouban('${safeTitle}')">
                    <img src="${originalCoverUrl}" alt="${safeTitle}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-110" 
                         onerror="this.onerror=null; this.src='${proxiedCoverUrl}'; this.classList.add('object-contain');" 
                         loading="lazy" referrerpolicy="no-referrer">
                    <div class="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60"></div>
                    <div class="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-sm">
                        <span class="text-yellow-400">★</span> ${safeRate}
                    </div>
                    <div class="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-sm hover:bg-[#333] transition-colors">
                        <a href="${url}" target="_blank" rel="noopener noreferrer" title="在豆瓣查看" onclick="event.stopPropagation();"> 🔗 </a>
                    </div>
                </div>
                <div class="p-2 text-center bg-[#111]">
                    <button onclick="fillAndSearchWithDouban('${safeTitle}')" class="text-sm font-medium text-white truncate w-full hover:text-pink-400 transition" title="${safeTitle}">
                        ${safeTitle}
                    </button>
                </div>
            `;
            fragment.appendChild(card);
        });
    }

    container.innerHTML = "";
    container.appendChild(fragment);
}

// 重置到首页
function resetToHome() {
    resetSearchArea();
    updateDoubanVisibility();
}

// 页面加载
document.addEventListener('DOMContentLoaded', initDouban);

// === 以下标签管理功能保持不变 ===

function showTagManageModal() {
    let modal = document.getElementById('tagManageModal');
    if (modal) document.body.removeChild(modal);

    const isMovie = doubanMovieTvCurrentSwitch === 'movie';
    const currentTags = isMovie ? movieTags : tvTags;
    const defaultTags = isMovie ? defaultMovieTags : defaultTvTags;

    modal = document.createElement('div');
    modal.id = 'tagManageModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40';
    modal.innerHTML = `
        <div class="bg-[#191919] rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative">
            <button id="closeTagModal" class="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">&times;</button>
            <h3 class="text-xl font-bold text-white mb-4">标签管理 (${isMovie ? '电影' : '电视剧'})</h3>
            <div class="mb-4">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="text-lg font-medium text-gray-300">标签列表</h4>
                    <button id="resetTagsBtn" class="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded">恢复默认标签</button>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4" id="tagsGrid">
                    ${currentTags.length ? currentTags.map(tag => {
                        const canDelete = tag !== '热门';
                        return `
                            <div class="bg-[#1a1a1a] text-gray-300 py-1.5 px-3 rounded text-sm font-medium flex justify-between items-center group">
                                <span>${tag}</span>
                                ${canDelete ? `<button class="delete-tag-btn text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" data-tag="${tag}">✕</button>` : `<span class="text-gray-500 text-xs italic opacity-0 group-hover:opacity-100">必需</span>`}
                            </div>
                        `;
                    }).join('') : `<div class="col-span-full text-center py-4 text-gray-500">无标签，请添加或恢复默认</div>`}
                </div>
            </div>
            <div class="border-t border-gray-700 pt-4">
                <h4 class="text-lg font-medium text-gray-300 mb-3">添加新标签</h4>
                <form id="addTagForm" class="flex items-center">
                    <input type="text" id="newTagInput" placeholder="输入标签名称..." class="flex-1 bg-[#222] text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-pink-500">
                    <button type="submit" class="ml-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded">添加</button>
                </form>
                <p class="text-xs text-gray-500 mt-2">提示：标签名称不能为空，不能重复，不能包含特殊字符</p>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => { document.getElementById('newTagInput').focus(); }, 100);

    document.getElementById('closeTagModal').addEventListener('click', () => document.body.removeChild(modal));
    modal.addEventListener('click', e => { if (e.target === modal) document.body.removeChild(modal); });

    document.getElementById('resetTagsBtn').addEventListener('click', () => {
        resetTagsToDefault();
        showTagManageModal();
    });

    document.querySelectorAll('.delete-tag-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteTag(this.getAttribute('data-tag'));
            showTagManageModal();
        });
    });

    document.getElementById('addTagForm').addEventListener('submit', e => {
        e.preventDefault();
        const input = document.getElementById('newTagInput');
        const newTag = input.value.trim();
        if (newTag) {
            addTag(newTag);
            input.value = '';
            showTagManageModal();
        }
    });
}

function addTag(tag) {
    const safeTag = tag.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const isMovie = doubanMovieTvCurrentSwitch === 'movie';
    const currentTags = isMovie ? movieTags : tvTags;
    const exists = currentTags.some(t => t.toLowerCase() === safeTag.toLowerCase());
    if (exists) {
        showToast('标签已存在', 'warning');
        return;
    }
    if (isMovie) movieTags.push(safeTag);
    else tvTags.push(safeTag);
    saveUserTags();
    renderDoubanTags();
    showToast('标签添加成功', 'success');
}

function deleteTag(tag) {
    if (tag === '热门') {
        showToast('热门标签不能删除', 'warning');
        return;
    }
    const isMovie = doubanMovieTvCurrentSwitch === 'movie';
    const currentTags = isMovie ? movieTags : tvTags;
    const index = currentTags.indexOf(tag);
    if (index !== -1) {
        currentTags.splice(index, 1);
        saveUserTags();
        if (doubanCurrentTag === tag) {
            doubanCurrentTag = '热门';
            renderRecommend();
        }
        renderDoubanTags();
        showToast('标签删除成功', 'success');
    }
}

function resetTagsToDefault() {
    const isMovie = doubanMovieTvCurrentSwitch === 'movie';
    if (isMovie) movieTags = [...defaultMovieTags];
    else tvTags = [...defaultTvTags];
    doubanCurrentTag = '热门';
    saveUserTags();
    renderDoubanTags();
    renderRecommend();
    showToast('已恢复默认标签', 'success');
}
