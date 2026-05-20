'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { topicsTree } from './topics';

// 🔹 Helper
const findExpandedKeys = (tree, targetFolder, currentPath = '') => {
  let result = {};

  for (const [key, value] of Object.entries(tree)) {
    const fullKey = currentPath ? `${currentPath}/${key}` : key;

    if (value.folder === targetFolder) {
      result[fullKey] = true;
      return result;
    }

    const children = value.children || (typeof value === 'object' ? value : null);
    if (children) {
      const childResult = findExpandedKeys(children, targetFolder, fullKey);
      if (Object.keys(childResult).length > 0) {
        result[fullKey] = true;
        result = { ...result, ...childResult };
        return result;
      }
    }
  }

  return result;
};

export default function Sidebar({ selectedFolder, onSelect }) {

  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem("sidebar_open");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [expandedKeys, setExpandedKeys] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("sidebar_expanded") || "{}");
    } catch {
      return {};
    }
  });

 useEffect(() => {
  localStorage.setItem("sidebar_open", JSON.stringify(open));
}, [open]);

useEffect(() => {
  localStorage.setItem("sidebar_expanded", JSON.stringify(expandedKeys));
}, [expandedKeys]);

  // ✅ AUTO EXPAND (ONLY FIRST TIME — NO STORAGE)
  useEffect(() => {
    if (!pathname) return;

    const hasSaved = localStorage.getItem("sidebar_expanded");
    if (hasSaved) return;

    const cleanPath = pathname.replace(/^\//, '');
    const expanded = findExpandedKeys(topicsTree, cleanPath);

    setExpandedKeys(expanded);

  }, [pathname]);

  const toggle = (key) => {
    setExpandedKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div
      style={{
        width: open ? 250 : 60,
        transition: 'width 0.25s ease',
        background: '#111827',
        color: '#e5e7eb',
        padding: 10,
        overflowY: 'auto',
        height: '100vh',
        borderRight: '1px solid #1f2937',
      }}
    >

      {/* Toggle */}
      <button
        onClick={() => setOpen(prev => !prev)}
        style={{
          background: '#1f2937',
          color: '#e5e7eb',
          border: 'none',
          padding: '6px 10px',
          borderRadius: 6,
          cursor: 'pointer',
          width: '100%',
          marginBottom: 10,
          fontSize: 14,
          textAlign: 'left',
        }}
      >
        {open ? '← Collapse' : '→'}
      </button>

      {/* Tree */}
      {open && (
        <TreeNode
          node={topicsTree}
          selectedFolder={selectedFolder}
          onSelect={onSelect}
          expandedKeys={expandedKeys}
          toggle={toggle}
          pathname={pathname}
        />
      )}
    </div>
  );
}


// 🌳 TreeNode (unchanged)
function TreeNode({
  node,
  selectedFolder,
  onSelect,
  expandedKeys,
  toggle,
  level = 0,
  parentKey = '',
  pathname,
}) {

  if (!node || typeof node !== "object") return null; // ✅ HARD GUARD

  return (
    <ul style={{ listStyle: 'none', paddingLeft: level * 10 }}>
      {Object.entries(node).map(([key, value]) => {

        const hasChildren = !!value?.children;
        const isLeaf = !value?.children && !!value?.folder;

        const fullKey = parentKey ? `${parentKey}/${key}` : key;
        const isExpanded = expandedKeys[fullKey] || false;

        const isActive =
          pathname?.replace(/^\//, '') === value?.folder;

        return (
          <li key={fullKey}>
            <div
              onMouseEnter={(e) => {
                if (hasChildren) {
                  e.currentTarget.style.background = '#1f2937';
                }
              }}
              onMouseLeave={(e) => {
                if (hasChildren) {
                  e.currentTarget.style.background =
                    isActive ? '#1e293b' : 'transparent';
                }
              }}
              style={{
                cursor: hasChildren ? 'pointer' : 'default',
                fontWeight: hasChildren && isActive ? 'bold' : 'normal',
                display: 'flex',
                alignItems: 'center',
                userSelect: 'none',
                padding: '4px 6px',
                borderRadius: '6px',
                backgroundColor: isActive ? '#1e293b' : 'transparent',
                color: isActive ? '#3b82f6' : '#d1d5db',
                marginBottom: 4,
              }}
            >

              {!isLeaf && (
                <span
                  onClick={() => toggle(fullKey)}
                  style={{
                    display: 'inline-block',
                    width: 14,
                    marginRight: 6,
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                    fontSize: 12,
                  }}
                >
                  ▶
                </span>
              )}

              {value?.folder ? (
                <Link
                  href={`/${value.folder}`}
                  onClick={() => toggle(fullKey)}
                  style={{
                    textDecoration: 'none',
                    color: isActive ? '#3b82f6' : '#d1d5db',
                    flex: 1,
                  }}
                >
                  {value.title || key}
                </Link>
              ) : (
                <span
                  style={{ flex: 1 }}
                  onClick={() => toggle(fullKey)}
                >
                  {value.title || key}
                </span>
              )}

            </div>

            {!isLeaf && isExpanded && (
              <TreeNode
                node={value.children || value} // ✅ FIXED
                selectedFolder={selectedFolder}
                onSelect={onSelect}
                expandedKeys={expandedKeys}
                toggle={toggle}
                level={level + 1}
                parentKey={fullKey}
                pathname={pathname}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}