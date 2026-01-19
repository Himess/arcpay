'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_CATEGORIES, TOTAL_API_COUNT, type APIItem, type APICategory } from './apiExamples';

interface APIExplorerProps {
  onSelectAPI: (api: APIItem, category: APICategory) => void;
  selectedAPI: APIItem | null;
}

export default function APIExplorer({ onSelectAPI, selectedAPI }: APIExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Core', 'Simple API']);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('arcpay_favorite_apis');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, []);

  // Save favorites to localStorage
  const toggleFavorite = (apiName: string) => {
    setFavorites((prev) => {
      const newFavorites = prev.includes(apiName)
        ? prev.filter((f) => f !== apiName)
        : [...prev, apiName];
      localStorage.setItem('arcpay_favorite_apis', JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  // Filter APIs based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return API_CATEGORIES;

    const query = searchQuery.toLowerCase();
    return API_CATEGORIES.map((category) => ({
      ...category,
      apis: category.apis.filter(
        (api) =>
          api.name.toLowerCase().includes(query) ||
          api.description.toLowerCase().includes(query)
      ),
    })).filter((category) => category.apis.length > 0);
  }, [searchQuery]);

  // Get favorite APIs
  const favoriteAPIs = useMemo(() => {
    const apis: { api: APIItem; category: APICategory }[] = [];
    API_CATEGORIES.forEach((category) => {
      category.apis.forEach((api) => {
        if (favorites.includes(`${category.name}:${api.name}`)) {
          apis.push({ api, category });
        }
      });
    });
    return apis;
  }, [favorites]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const isSelected = (category: APICategory, api: APIItem) =>
    selectedAPI?.name === api.name &&
    API_CATEGORIES.find(c => c.apis.includes(selectedAPI))?.name === category.name;

  return (
    <div className="h-full flex flex-col bg-gray-900/50 rounded-xl border border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
          <span>📚</span>
          <span>API Explorer</span>
          <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full">
            {TOTAL_API_COUNT} APIs
          </span>
        </h3>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search APIs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 pl-10 text-sm focus:outline-none focus:border-cyan-500"
          />
          <svg
            className="absolute left-3 top-2.5 w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Favorites Section */}
      {favoriteAPIs.length > 0 && !searchQuery && (
        <div className="px-4 py-2 border-b border-gray-800">
          <button
            onClick={() => toggleCategory('__favorites__')}
            className="flex items-center gap-2 w-full p-2 hover:bg-gray-800 rounded text-left"
          >
            <span className="text-yellow-400">
              {expandedCategories.includes('__favorites__') ? '▼' : '▶'}
            </span>
            <span>⭐</span>
            <span className="font-medium">Favorites</span>
            <span className="text-xs text-gray-500">({favoriteAPIs.length})</span>
          </button>
          <AnimatePresence>
            {expandedCategories.includes('__favorites__') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="ml-6 mt-1 space-y-1"
              >
                {favoriteAPIs.map(({ api, category }) => (
                  <button
                    key={`fav-${category.name}-${api.name}`}
                    onClick={() => onSelectAPI(api, category)}
                    className={`block w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                      isSelected(category, api)
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-800 text-gray-300'
                    }`}
                  >
                    <span className="text-gray-500">{category.icon}</span>{' '}
                    {api.name}()
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Categories */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredCategories.map((category) => (
          <div key={category.name} className="mb-1">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.name)}
              className="flex items-center gap-2 w-full p-2 hover:bg-gray-800 rounded text-left"
            >
              <span className="text-gray-400 text-sm">
                {expandedCategories.includes(category.name) ? '▼' : '▶'}
              </span>
              <span>{category.icon}</span>
              <span className="font-medium">{category.name}</span>
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                {category.apis.length}
              </span>
            </button>

            {/* API Items */}
            <AnimatePresence>
              {expandedCategories.includes(category.name) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="ml-6 mt-1 space-y-0.5"
                >
                  {category.apis.map((api) => {
                    const favKey = `${category.name}:${api.name}`;
                    const isFav = favorites.includes(favKey);

                    return (
                      <div
                        key={api.name}
                        className={`group flex items-center rounded transition-colors ${
                          isSelected(category, api)
                            ? 'bg-blue-600'
                            : 'hover:bg-gray-800'
                        }`}
                      >
                        <button
                          onClick={() => onSelectAPI(api, category)}
                          className={`flex-1 text-left px-3 py-2 text-sm ${
                            isSelected(category, api) ? 'text-white' : 'text-gray-300'
                          }`}
                        >
                          {api.name}()
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(favKey);
                          }}
                          className={`px-2 py-1 text-sm transition-opacity ${
                            isFav
                              ? 'text-yellow-400'
                              : 'text-gray-600 opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          {isFav ? '★' : '☆'}
                        </button>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No APIs found for "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-cyan-400 mt-2 text-sm"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-gray-800 text-xs text-gray-500 text-center">
        {API_CATEGORIES.length} modules • {TOTAL_API_COUNT} APIs
      </div>
    </div>
  );
}
