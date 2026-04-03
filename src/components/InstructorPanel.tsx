export interface InstructorPanelProps {
  value: string;
  onChange: (value: string) => void;
}

export function InstructorPanel({ value, onChange }: InstructorPanelProps) {
  return (
    <section className="instructor-panel" aria-labelledby="instructor-panel-title">
      <div className="section-heading">
        <div>
          <h2 id="instructor-panel-title">Instructor Name</h2>
          <p>
            This field is editable because the source document may reflect a previous
            instructor.
          </p>
        </div>
      </div>

      <label className="instructor-panel__field" htmlFor="instructor-panel-input">
        <span>Instructor name</span>
        <input
          id="instructor-panel-input"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </section>
  );
}
