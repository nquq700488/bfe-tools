import { createRouter, createWebHistory } from 'vue-router';
/**
 * 路由配置
 * 按功能领域划分，首页为工具入口，工具页为各工具详情
 */
const routes = [
    {
        path: '/',
        name: 'home',
        component: () => import('@/pages/HomePage.vue'),
        meta: { title: '首页' },
    },
    {
        path: '/tools/:toolId',
        name: 'tool',
        component: () => import('@/pages/ToolPage.vue'),
        meta: { title: '工具' },
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/pages/NotFoundPage.vue'),
        meta: { title: '404' },
    },
];
export const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
    scrollBehavior() {
        return { top: 0 };
    },
});
// 全局标题守卫
router.afterEach((to) => {
    const title = to.meta.title || 'bfe-tools';
    document.title = `${title} — bfe-tools`;
});
