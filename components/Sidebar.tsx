
import React from 'react';
import { SectionId, UserInfo } from '../types';
import { SECTIONS, getIcon } from '../constants';
import { School, Menu } from 'lucide-react';

interface SidebarProps {
  activeId: SectionId;
  onSelect: (id: SectionId) => void;
  isDarkMode: boolean;
  userInfo: UserInfo | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeId, onSelect, isDarkMode, userInfo, isCollapsed, onToggleCollapse }) => {
  const isSettingsActive = activeId === SectionId.Settings;

  return (
    <div className={`flex h-full transition-all duration-300 ease-in-out border-r ${isCollapsed ? 'w-[72px]' : 'w-[260px]'} ${isDarkMode ? 'bg-[#2f3136] border-[#202225]' : 'bg-[#f2f3f5] border-[#e3e5e8]'}`}>
      
      {/* Sidebar Content Wrapper */}
      <div className="flex flex-col w-full h-full overflow-hidden">
        
        {/* TOP: Avatar & Branding Row (Whole area is clickable) */}
        <div 
          onClick={() => onSelect(SectionId.Settings)}
          className="flex items-center px-3 py-3 shrink-0 h-[72px] cursor-pointer group/header relative"
        >
          <div 
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative overflow-hidden shrink-0
              ${isSettingsActive ? 'bg-[#5865f2]' : `${isDarkMode ? 'bg-[#36393f]' : 'bg-[#dee2e6]'} group-hover/header:bg-[#5865f2]`}`}
          >
            {userInfo?.photoUrl ? (
              <img 
                src={userInfo.photoUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover rounded-[inherit] transition-all duration-200" 
              />
            ) : (
               <School size={20} className={`transition-colors ${isSettingsActive ? 'text-white' : (isDarkMode ? 'text-white' : 'text-slate-800')} group-hover/header:text-white`} />
            )}
            
            {/* Active Indicator for Settings */}
            {isSettingsActive && (
              <div className={`absolute left-[-16px] w-2 h-8 rounded-r-lg ${isDarkMode ? 'bg-white' : 'bg-gray-700'}`} />
            )}
          </div>
          
          <div className={`ml-3 overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[180px] opacity-100'}`}>
            <span className={`font-bold text-[15px] leading-tight transition-colors ${isSettingsActive ? (isDarkMode ? 'text-white' : 'text-gray-900') : (isDarkMode ? 'text-gray-300 group-hover/header:text-white' : 'text-gray-600 group-hover/header:text-gray-900')}`}>
              Школьный помощник
            </span>
          </div>
        </div>

        {/* First Divider Strip */}
        <div className="px-4 shrink-0">
          <div className={`h-[2px] rounded-full w-full ${isDarkMode ? 'bg-[#36393f]' : 'bg-[#d4d7dc]'}`} />
        </div>

        {/* Navigation & Tools Section */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 custom-scrollbar">
          
          {/* Collapse Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            className={`w-full group flex items-center rounded-md transition-all duration-200 h-10 px-3 mb-1 shrink-0
              ${isDarkMode ? 'text-[#8e9297] hover:bg-[#35383c] hover:text-[#dcddde]' : 'text-gray-500 hover:bg-[#e9ecef] hover:text-gray-900'}
            `}
            title={isCollapsed ? "Развернуть" : "Свернуть"}
          >
            <div className="w-6 flex items-center justify-center shrink-0">
              <Menu size={20} />
            </div>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ml-3 ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[180px] opacity-100'}`}>
              <span className="text-[14px] font-medium">Свернуть меню</span>
            </div>
          </button>

          {/* Second Divider (Subtler, between menu toggle and tools) */}
          <div className="px-2 py-2 shrink-0">
            <div className={`h-[1px] rounded-full w-full opacity-60 ${isDarkMode ? 'bg-[#36393f]' : 'bg-[#d4d7dc]'}`} />
          </div>

          {/* Tools List */}
          {SECTIONS.filter(s => s.id !== SectionId.Settings).map((section) => {
            const isActive = activeId === section.id;
            return (
              <button
                key={section.id}
                onClick={() => onSelect(section.id)}
                className={`w-full group flex items-center rounded-md transition-all duration-200 relative overflow-hidden h-10 px-3 shrink-0
                  ${isActive 
                    ? (isDarkMode ? 'bg-[#424549] text-white' : 'bg-[#dee2e6] text-gray-900') 
                    : (isDarkMode ? 'text-[#8e9297] hover:bg-[#35383c] hover:text-[#dcddde]' : 'text-gray-500 hover:bg-[#e9ecef] hover:text-gray-900')
                  }
                `}
                title={isCollapsed ? section.label : ''}
              >
                {isActive && (
                  <div className={`absolute left-0 w-1 rounded-r-full transition-all duration-300 ${isCollapsed ? 'h-8' : 'h-5'} ${isDarkMode ? 'bg-white' : 'bg-gray-800'}`} />
                )}
                
                <div className="w-6 flex items-center justify-center shrink-0" style={{ color: isActive ? section.color : 'inherit' }}>
                  {getIcon(section.icon, 20)}
                </div>
                
                <div className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ml-3 ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[180px] opacity-100'}`}>
                  <span className={`text-[14px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {section.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
