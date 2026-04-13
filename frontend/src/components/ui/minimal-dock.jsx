import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserContext } from '../../context/UserContext';
import { NAVIGATION_CONFIG } from '../../config/navigation';

const DockItemComponent = ({ item, isHovered, onHover, isActive }) => {
  return (
    <div
      className="relative group flex items-center justify-center"
      onMouseEnter={() => onHover(item.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div
        className={`
          relative flex items-center justify-center
          w-10 h-10 rounded-lg
          backdrop-blur-md
          transition-all duration-300 ease-out
          cursor-pointer
          shadow-none
          ${isHovered 
            ? 'scale-105 -translate-y-0.5 z-10' 
            : 'z-0'
          }
        `}
        style={{
          background: isHovered || isActive ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.02)',
          border: isHovered || isActive ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(255,255,255,0.06)',
          boxShadow: isHovered || isActive
            ? '0 4px 16px 0 rgba(52,211,153,0.15)'
            : 'none'
        }}
        onClick={item.onClick}
      >
        <div style={{
          color: isHovered || isActive ? '#34D399' : '#9CA3AF',
          transition: 'all 0.3s'
        }}>
          {item.icon}
        </div>
      </div>
      
      {/* Tooltip */}
      <div className={`
        absolute -top-10 left-1/2 transform -translate-x-1/2
        px-3 py-1.5 rounded-lg
        backdrop-blur-xl
        text-white text-[0.7rem] font-medium tracking-wide
        border
        transition-all duration-200
        pointer-events-none
        whitespace-nowrap
        z-50
        ${isHovered 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-1'
        }
      `}
      style={{
        background: 'rgba(13,13,15,0.85)',
        borderColor: 'rgba(255,255,255,0.06)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }}>
        {item.label}
        {/* Tooltip Arrow */}
        <div className="absolute top-[98%] left-1/2 transform -translate-x-1/2">
          <div style={{
            width: 6, height: 6,
            background: 'rgba(13,13,15,0.85)',
            transform: 'rotate(45deg) translateY(-3px)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.06)'
          }}></div>
        </div>
      </div>
    </div>
  );
};

const MinimalistDock = () => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const { profile } = useUserContext();
  const role = profile?.role;
  const navItems = NAVIGATION_CONFIG[role] || [];
  
  // Dock usually shouldn't show the CTA "+ Create Invoice" so we filter that out
  const dockItems = navItems.filter(i => !i.isPrimaryCTA).slice(0, 4);

  return (
    <div className={`
      flex items-center gap-2 px-2 py-1.5 h-auto
      rounded-xl
      backdrop-blur-xl
      transition-all duration-500 ease-out
    `}
    style={{
      background: 'rgba(10, 20, 16, 0.6)',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {dockItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <DockItemComponent
            key={item.label}
            item={{...item, icon: <item.icon size={18} />, onClick: () => navigate(item.path)}}
            isHovered={hoveredItem === item.label}
            onHover={setHoveredItem}
            isActive={isActive}
          />
        )
      })}
    </div>
  );
};

export default MinimalistDock;
