'use client';

/** Skeleton block — shimmering placeholder */
function Sk({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton ${className}`} style={style} />;
}

/** Dashboard skeleton: 4 stat cards + activity list + project cards */
export function DashboardSkeleton() {
  return (
    <div className="animate-fade-in">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-line rounded-xl p-4">
            <Sk className="h-3 w-20 mb-3" />
            <Sk className="h-7 w-14 mb-2" />
            <Sk className="h-2.5 w-24" />
          </div>
        ))}
      </div>

      {/* Activity header */}
      <Sk className="h-5 w-44 mb-4" />
      <div className="bg-white border border-line rounded-xl px-5 py-1 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 py-3 border-b border-line-light last:border-none">
            <Sk className="w-2 h-2 rounded-full mt-[5px] flex-shrink-0" />
            <div className="flex-1">
              <Sk className="h-3.5 w-3/4 mb-1.5" />
              <Sk className="h-2.5 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Projects header */}
      <div className="flex justify-between items-center mb-4">
        <Sk className="h-5 w-24" />
        <Sk className="h-8 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 max-sm:grid-cols-1">
        {[...Array(2)].map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Single project card skeleton */
export function ProjectCardSkeleton() {
  return (
    <div className="bg-white border border-line rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Sk className="h-4 w-48 mb-2" />
          <Sk className="h-3 w-32" />
        </div>
        <Sk className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex gap-4 mt-3">
        <Sk className="h-3 w-20" />
        <Sk className="h-3 w-20" />
        <Sk className="h-3 w-20" />
      </div>
    </div>
  );
}

/** Projects list skeleton */
export function ProjectsListSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Project page skeleton: tabs + content */
export function ProjectPageSkeleton() {
  return (
    <div className="animate-fade-in">
      {/* Header card */}
      <div className="bg-white border border-line rounded-xl p-6 mb-5">
        <Sk className="h-5 w-56 mb-2" />
        <Sk className="h-3.5 w-36 mb-4" />
        <div className="flex gap-4 pt-3 border-t border-line-light">
          <Sk className="h-3 w-24" />
          <Sk className="h-3 w-24" />
          <Sk className="h-3 w-24" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5">
        {[...Array(5)].map((_, i) => (
          <Sk key={i} className="h-8 rounded-lg" style={{ width: `${60 + i * 10}px` }} />
        ))}
      </div>

      {/* Content */}
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-line rounded-xl p-4">
            <Sk className="h-4 w-64 mb-2" />
            <Sk className="h-3 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Visit page skeleton: header + photo grid */
export function VisitPageSkeleton() {
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-white border border-line rounded-xl p-6 mb-5">
        <Sk className="h-4 w-32 mb-2" />
        <Sk className="h-5 w-56 mb-1" />
        <Sk className="h-3 w-40 mb-4" />
        <div className="flex gap-6 pt-3 border-t border-line-light">
          <Sk className="h-3 w-20" />
          <Sk className="h-3 w-20" />
          <Sk className="h-3 w-20" />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <Sk key={i} className="h-8 w-20 rounded-lg" />
          ))}
        </div>
        <Sk className="h-9 w-32 rounded-lg" />
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5 max-sm:grid-cols-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-line rounded-xl overflow-hidden">
            <Sk className="w-full h-[180px] rounded-none" />
            <div className="p-3.5">
              <Sk className="h-3.5 w-3/4 mb-2" />
              <Sk className="h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Sk;
