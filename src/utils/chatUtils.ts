import { Message } from '../types/chat';

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const createMessage = (role: 'user' | 'assistant', content: string): Message => {
  return {
    id: generateId(),
    role,
    content,
    timestamp: new Date(),
  };
};

export const simulateApiResponse = async (message: string): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  const responses = [
    '안녕하세요! 무엇을 도와드릴까요?',
    '좋은 질문이네요! 더 자세한 내용을 알려주세요.',
    '이해했습니다. 다른 질문이 있으시면 언제든 물어보세요.',
    '흥미로운 내용이에요! 더深入的探讨해봅시다.',
  ];

  return responses[Math.floor(Math.random() * responses.length)];
};
