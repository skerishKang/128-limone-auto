import { useState, useRef, useEffect } from 'react';

interface EditableTitleProps {
  title: string;
  onUpdate: (newTitle: string) => void;
  className?: string;
}

export default function EditableTitle({
  title,
  onUpdate,
  className = '',
}: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentTitle(title);
  }, [title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (currentTitle.trim()) {
      onUpdate(currentTitle.trim());
      setIsEditing(false);
    } else {
      setCurrentTitle(title);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setCurrentTitle(title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={currentTitle}
        onChange={(e) => setCurrentTitle(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`
          text-sm font-medium text-gray-800 bg-white border border-yellow-400 rounded
          px-2 py-1 outline-none focus:ring-2 focus:ring-yellow-300
          ${className}
        `}
      />
    );
  }

  return (
    <span
      onDoubleClick={() => setIsEditing(true)}
      className={`
        text-sm font-medium text-gray-800 cursor-text
        hover:bg-yellow-50 rounded px-1 py-0.5 transition-colors
        inline-block
        ${className}
      `}
      title="더블클릭하여 수정"
    >
      {title}
    </span>
  );
}
