import React from 'react';
import { useParams } from 'react-router-dom';

const EditorPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    
    return (
        <div className="min-h-screen flex items-center justify-center">
            <h1 className="text-4xl font-bold">Editor - Project {projectId} (重构中)</h1>
        </div>
    );
};

export default EditorPage;
