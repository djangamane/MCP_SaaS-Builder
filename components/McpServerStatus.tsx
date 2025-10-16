import React from 'react';
import { McpServer } from '../types';

interface McpServerStatusProps {
  servers: McpServer[];
}

const McpServerStatus: React.FC<McpServerStatusProps> = ({ servers }) => {
  return (
    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 shadow-lg">
      <h2 className="text-xl font-semibold text-white mb-4">2. Connected MCP Servers</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-4">
        {servers.map((server) => (
          <div key={server.name} className="bg-gray-900 p-4 rounded-lg border border-gray-700 flex flex-col items-center text-center hover:bg-gray-800/60 transition-colors duration-200">
            <div className="relative">
              <server.icon className="w-8 h-8 text-cyan-400 mb-2" />
              <div className="absolute top-0 right-0 -mt-1 -mr-1 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900" title="Connected"></div>
            </div>
            <p className="font-semibold text-sm text-white">{server.name}</p>
            <p className="text-xs text-gray-400">{server.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default McpServerStatus;
